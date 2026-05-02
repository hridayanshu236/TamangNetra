from bs4 import BeautifulSoup, NavigableString
import logging
from typing import List, Dict, Any, Callable, Awaitable
from app.services.translation import TranslationService

logger = logging.getLogger(__name__)

class HighFidelityPdfTranslator:
    def __init__(self, translation_service: TranslationService):
        self.translation_service = translation_service

    async def translate_html(self, html_content: str, src_lang: str, tgt_lang: str, progress_callback=None, cache_only: bool = False) -> str:
        """
        Walks the HTML tree and translates only natural language text.
        Protects:
        - Elements with class 'math'
        - Tag structure (table, div, span)
        """
        soup = BeautifulSoup(html_content, "html.parser")
        
        # 1. Collect all translatable text nodes
        translatable_nodes = []
        
        def _collect_text(element):
            # Skip script/style
            if element.name in ['script', 'style']:
                return
            
            # Skip elements marked as math
            if element.name == 'span' and 'math' in element.get('class', []):
                return

            for child in element.children:
                if isinstance(child, NavigableString):
                    text = child.strip()
                    if text and len(text) > 1: # Ignore single chars/numbers usually
                        translatable_nodes.append(child)
                elif child.name:
                    _collect_text(child)

        _collect_text(soup.body)

        # 2. Extract texts for batch translation
        texts_to_translate = [str(node).strip() for node in translatable_nodes]
        
        if not texts_to_translate:
            return str(soup)

        # 3. Batch translate
        translated_texts = await self.translation_service.batch_translate(
            texts_to_translate, src_lang, tgt_lang, progress_callback=progress_callback, cache_only=cache_only
        )

        # 4. Replace text in soup
        for node, translated in zip(translatable_nodes, translated_texts):
            # Maintain original spacing if possible
            original = str(node)
            leading_space = " " if original.startswith(" ") else ""
            trailing_space = " " if original.endswith(" ") else ""
            node.replace_with(f"{leading_space}{translated}{trailing_space}")

        return str(soup)
