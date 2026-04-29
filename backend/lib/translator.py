import os
import re
import asyncio
import httpx
from typing import Dict, List, Optional
from lib import sentence_splitter

LANGUAGE_CODE_MAP = {
    "EN": "en",
    "NP": "ne",
    "TM": "tmg"
}

TRIPLETS = [
    # Latin mappings
    ("hello", "namaste", "phyfajyulla"),
    ("goodbye", "bida", "chyot"),
    ("thanks", "dhanyabad", "thujhe"),
    ("one", "ek", "gik"),
    ("two", "dui", "nyi"),
    ("three", "teen", "som"),
    ("four", "char", "bli"),
    ("five", "paanch", "nga"),
    ("six", "chha", "truk"),
    ("seven", "saat", "nis"),
    ("eight", "aath", "pre"),
    ("nine", "nau", "ku"),
    ("ten", "das", "chu"),
    ("water", "pani", "kwei"),
    ("food", "khana", "kan"),
    ("house", "ghar", "dim"),
    ("road", "baato", "gyam"),
    ("work", "kaam", "ge"),
    ("meeting", "baithak", "chhojom"),
    ("document", "kagaj", "yigcha"),
    ("report", "pratibedan", "thigug"),
    ("government", "sarkar", "sarkar"),
    ("community", "samudaya", "khajom"),
    ("village", "gaun", "yhul"),
    ("city", "sahar", "sahar"),
    ("friend", "sathi", "ro"),
    ("family", "pariwar", "nangtshang"),
    ("name", "naam", "min"),
    ("time", "samaya", "belha"),
    ("day", "din", "nyi"),
    ("night", "raat", "mhwn"),
    ("sun", "gham", "nyi"),
    ("moon", "jun", "lha"),
    ("tree", "rukh", "dong"),
    ("forest", "jungle", "nagh"),
    ("animal", "janawar", "semchen"),
    ("bird", "chara", "nhempa"),
    ("fish", "machha", "ngha"),
    ("book", "kitab", "tshewa"),
    ("language", "bhasa", "tam"),
    ("school", "bidhyalaya", "lhaptra"),
    ("hospital", "aspatal", "menkhang"),
    ("market", "bazaar", "tshongkhang"),
    ("money", "paisa", "tangka"),
    ("clothing", "luga", "gwan"),
    ("fire", "aago", "me"),
    ("earth", "mato", "sa"),
    ("is", "ho", "hin"),
    ("are", "hun", "hin"),
    ("have", "chha", "mula"),
    ("do", "gar", "la"),
    ("go", "jaa", "nyar"),
    ("come", "aau", "kha"),
    ("see", "her", "chyang"),
    ("say", "bhan", "sung"),
    ("eat", "khana", "cha"),
    ("drink", "piu", "thung"),
    ("sleep", "sut", "nyar"),
    ("read", "padh", "klo"),
    ("write", "lekh", "tri"),

    # Devanagari mappings (overrides EN -> NP/TM to output Devanagari, but preserves Latin inputs)
    ("hello", "नमस्ते", "फ्याफुल्ला"),
    ("goodbye", "बिदा", "छ्योत"),
    ("thanks", "धन्यवाद", "थुजे"),
    ("one", "एक", "गिक"),
    ("two", "दुई", "न्यी"),
    ("three", "तीन", "सोम"),
    ("four", "चार", "ब्ली"),
    ("five", "पाँच", "ङा"),
    ("six", "छ", "ट्रुक"),
    ("seven", "सात", "निस"),
    ("eight", "आठ", "प्रे"),
    ("nine", "नौ", "कु"),
    ("ten", "दस", "चु"),
    ("water", "पानी", "क्वे"),
    ("food", "खाना", "कान"),
    ("house", "घर", "दिम"),
    ("road", "बाटो", "ग्याम"),
    ("work", "काम", "गे"),
    ("meeting", "बैठक", "छोजोम"),
    ("document", "कागज", "यिगचा"),
    ("report", "प्रतिवेदन", "थिगुग"),
    ("government", "सरकार", "सरकार"),
    ("community", "समुदाय", "खाजोम"),
    ("village", "गाउँ", "य्हूल"),
    ("city", "शहर", "शहर"),
    ("friend", "साथी", "रो"),
    ("family", "परिवार", "नाङछाङ"),
    ("name", "नाम", "मिन"),
    ("time", "समय", "बेल्हा"),
    ("day", "दिन", "न्यी"),
    ("night", "रात", "म्ह्वन"),
    ("sun", "घाम", "न्यी"),
    ("moon", "जुन", "ल्हा"),
    ("tree", "रुख", "दोङ"),
    ("forest", "जंगल", "नाघ"),
    ("animal", "जनावर", "सेमचेन"),
    ("bird", "चरा", "न्हेम्पा"),
    ("fish", "माछा", "ङा"),
    ("book", "किताब", "छेवा"),
    ("language", "भाषा", "ताम"),
    ("school", "विद्यालय", "ल्हापत्रा"),
    ("hospital", "अस्पताल", "मेन्खाङ"),
    ("market", "बजार", "छोङ्खाङ"),
    ("money", "पैसा", "ताङ्का"),
    ("clothing", "लुगा", "ग्वान"),
    ("fire", "आगो", "मे"),
    ("earth", "माटो", "सा"),
    ("is", "हो", "हिन"),
    ("are", "हुन्", "हिन"),
    ("have", "छ", "मुला"),
    ("do", "गर", "ला"),
    ("go", "जा", "न्यार"),
    ("come", "आउ", "खा"),
    ("see", "हेर", "च्याङ"),
    ("say", "भन", "सुङ"),
    ("eat", "खा", "चा"),
    ("drink", "पिउ", "थुङ"),
    ("sleep", "सुत", "न्यार"),
    ("read", "पढ", "क्लो"),
    ("write", "लेख", "त्री")
]

class HackathonTranslator:
    def __init__(self):
        self.api_url = os.getenv("HACKATHON_API_URL") or os.getenv("API_URL")
        self.api_key = os.getenv("HACKATHON_API_KEY") or os.getenv("API_KEY")

    async def _translate_one(self, client: httpx.AsyncClient, text: str, src_lang: str, tgt_lang: str) -> str:
        if not text.strip():
            return text
            
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "text": text,
            "src_lang": LANGUAGE_CODE_MAP.get(src_lang.upper(), src_lang),
            "tgt_lang": LANGUAGE_CODE_MAP.get(tgt_lang.upper(), tgt_lang)
        }
        
        try:
            response = await client.post(self.api_url, headers=headers, json=payload, timeout=15.0)
            data = response.json()
            if data.get("message_type") == "SUCCESS" and data.get("output"):
                return data["output"]
            else:
                return text + " [translation_failed]"
        except Exception:
            return text + " [translation_failed]"

    async def translate(self, text: str, source: str, target: str, glossary: Dict = None) -> Dict:
        segments = sentence_splitter.split_sentences(text)
        
        async def keep_original(val):
            return val
            
        async with httpx.AsyncClient() as client:
            tasks = []
            for seg in segments:
                if seg.get("preserve_as_is"):
                    tasks.append(keep_original(seg["text"]))
                else:
                    tasks.append(self._translate_one(client, seg["text"], source, target))
                    
            results = await asyncio.gather(*tasks)
            
        failed_count = 0
        translated_segments = []
        
        for i, res in enumerate(results):
            if "[translation_failed]" in res:
                failed_count += 1
            
            translated_segments.append({
                "id": segments[i].get("id", i),
                "original": segments[i]["text"],
                "translated": res
            })
            
        assembled_string = sentence_splitter.assemble_segments(translated_segments)
        
        total_segments = len(segments) if segments else 1
        confidence = 1.0 - (failed_count / total_segments) * 0.3
        confidence = round(max(0.0, confidence), 2)
        
        return {
            "translation": assembled_string,
            "segments": translated_segments,
            "confidence": confidence,
            "alternatives": []
        }

class MockTranslator:
    # TODO: Replace MockTranslator with HackathonTranslator in production.
    def __init__(self):
        self.dicts = {
            "EN-NP": {t[0]: t[1] for t in TRIPLETS},
            "EN-TM": {t[0]: t[2] for t in TRIPLETS},
            "NP-EN": {t[1]: t[0] for t in TRIPLETS},
            "NP-TM": {t[1]: t[2] for t in TRIPLETS},
            "TM-EN": {t[2]: t[0] for t in TRIPLETS},
            "TM-NP": {t[2]: t[1] for t in TRIPLETS},
        }

    async def translate(self, text: str, source: str, target: str, glossary: Dict = None) -> Dict:
        pair_key = f"{source.upper()}-{target.upper()}"
        trans_dict = self.dicts.get(pair_key, {})

        if glossary:
            print(f"Preserving terms: {glossary}")

        preserved_tokens = {}
        if glossary:
            idx = 0
            all_terms = []
            for labels, terms in glossary.items():
                all_terms.extend(terms)
            all_terms.sort(key=len, reverse=True)

            for term in all_terms:
                placeholder = f"__GLOSSARY_{idx}__"
                pattern = re.compile(r'\b' + re.escape(term) + r'\b', re.IGNORECASE)
                if pattern.search(text):
                    text = pattern.sub(placeholder, text)
                    preserved_tokens[placeholder] = term
                    idx += 1

        words = text.split()
        translated_words = []
        unknown_count = 0
        total_words = 0

        for w in words:
            match_ph = re.match(r'^(__GLOSSARY_\d+__)([\.,!?;:]*)$', w)
            if match_ph and match_ph.group(1) in preserved_tokens:
                term = preserved_tokens[match_ph.group(1)]
                punct = match_ph.group(2)
                translated_words.append(f"{term}{punct}")
                continue

            match = re.match(r'^(.*?)([\.,!?;:]*)$', w)
            if not match:
                translated_words.append(w)
                continue
                
            core_word = match.group(1)
            punct = match.group(2)
            
            clean_w = core_word.lower()
            
            if not clean_w:
                translated_words.append(w)
                continue

            total_words += 1
            if clean_w in trans_dict:
                translated_words.append(f"{trans_dict[clean_w]}{punct}")
            else:
                translated_words.append(f"{core_word}(mock){punct}")
                unknown_count += 1

        if total_words == 0:
            confidence = 1.0
        elif unknown_count == 0:
            confidence = 1.0
        elif unknown_count == total_words:
            confidence = 0.0
        else:
            confidence = 0.5

        return {
            "translation": " ".join(translated_words),
            "segments": [],
            "confidence": confidence,
            "alternatives": []
        }

def get_translator():
    api_url = os.getenv("HACKATHON_API_URL") or os.getenv("API_URL")
    api_key = os.getenv("HACKATHON_API_KEY") or os.getenv("API_KEY")
    
    if api_url and api_key:
        print("Using HackathonTranslator")
        return HackathonTranslator()
    else:
        print("Using MockTranslator")
        return MockTranslator()
