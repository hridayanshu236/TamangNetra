import fitz  # PyMuPDF
from backend.services.sentence_splitter import split as split_sentences

async def process_pdf(input_path, output_path, src, tgt, translator, glossary, progress_cb):
    doc = fitz.open(input_path)
    
    # Extract all text blocks across all pages
    all_blocks = []
    for page_num, page in enumerate(doc):
        blocks = page.get_text("dict", flags=fitz.TEXT_PRESERVE_WHITESPACE)["blocks"]
        for block in blocks:
            if block["type"] != 0:  # skip image blocks
                continue
            full_text = " ".join(
                span["text"]
                for line in block["lines"]
                for span in line["spans"]
                if span["text"].strip()
            )
            if not full_text.strip():
                continue
            # Get font info from first span
            first_span = block["lines"][0]["spans"][0]
            all_blocks.append({
                "page": page_num,
                "bbox": block["bbox"],
                "text": full_text,
                "font": first_span.get("font", "helv"),
                "size": first_span.get("size", 12),
                "color": first_span.get("color", 0),
                "flags": first_span.get("flags", 0),  # bold=16, italic=2
            })

    # Count all sentences for progress reporting
    all_sentences = []
    block_sentence_map = []
    for block in all_blocks:
        sentences = split_sentences(block["text"], src)
        block_sentence_map.append((len(all_sentences), len(sentences)))
        all_sentences.extend(sentences)

    total = len(all_sentences)
    translated_sentences = []

    for i, sentence in enumerate(all_sentences):
        t = await translator.translate(sentence, src, tgt)
        # Learn proper nouns on the fly
        for term in glossary.extract_terms(sentence):
            if term not in glossary.cache:
                term_translated = await translator.translate(term, src, tgt)
                glossary.learn(term, term_translated)
                total += 1  # update total
        translated_sentences.append(t)
        await progress_cb(i + 1, total, f"Page {all_blocks[_find_block(block_sentence_map, i)]['page']+1}")

    # Build new PDF
    new_doc = fitz.open()
    for page_num, orig_page in enumerate(doc):
        new_page = new_doc.new_page(width=orig_page.rect.width, height=orig_page.rect.height)
        # Copy background (images, vector art)
        new_page.show_pdf_page(orig_page.rect, doc, page_num)

        page_blocks = [(i, b) for i, b in enumerate(all_blocks) if b["page"] == page_num]
        for bi, block in page_blocks:
            s_start, s_count = block_sentence_map[bi]
            translated_text = " ".join(translated_sentences[s_start:s_start + s_count])

            bbox = fitz.Rect(block["bbox"])
            orig_len = max(len(block["text"]), 1)
            trans_len = len(translated_text)
            font_size = block["size"]

            # Shrink font if translation is >30% longer
            if trans_len > orig_len * 1.3:
                font_size = max(6, font_size * (orig_len / trans_len))

            # White out original text area
            new_page.draw_rect(bbox, color=(1, 1, 1), fill=(1, 1, 1))

            # Pick font: bold, italic, or plain
            flags = block.get("flags", 0)
            fontname = "hebo" if flags & 16 else "hebi" if flags & 2 else "helv"

            r, g, b = _int_to_rgb(block["color"])
            new_page.insert_textbox(
                bbox, translated_text,
                fontname=fontname, fontsize=font_size,
                color=(r, g, b), align=0, overlay=True
            )

    new_doc.save(output_path)
    new_doc.close()
    doc.close()

def _int_to_rgb(color_int):
    r = ((color_int >> 16) & 0xFF) / 255
    g = ((color_int >> 8) & 0xFF) / 255
    b = (color_int & 0xFF) / 255
    return r, g, b

def _find_block(block_sentence_map, sentence_idx):
    for bi, (start, count) in enumerate(block_sentence_map):
        if start <= sentence_idx < start + count:
            return bi
    return 0