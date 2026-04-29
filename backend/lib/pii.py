import re
import spacy
from typing import Tuple, Dict

# Load the spacy English model
nlp = spacy.load("en_core_web_sm")

def scrub(text: str) -> Tuple[str, Dict[str, str]]:
    mapping_dict = {}
    
    # Track counters for placeholders
    counters = {
        "EMAIL": 1,
        "PHONE": 1,
        "URL": 1,
        "NAME": 1,
    }

    # Helper function to replace matches with a placeholder
    def replace_match(match, pii_type):
        nonlocal mapping_dict, counters
        original = match.group(0)
        
        placeholder = f"[{pii_type}_{counters[pii_type]}]"
        mapping_dict[placeholder] = original
        counters[pii_type] += 1
        return placeholder

    sanitized_text = text

    # 1. Emails: \S+@\S+\.\S+
    email_pattern = r'\S+@\S+\.\S+'
    sanitized_text = re.sub(email_pattern, lambda m: replace_match(m, "EMAIL"), sanitized_text)

    # 2. URLs: http[s]?://\S+
    url_pattern = r'http[s]?://\S+'
    sanitized_text = re.sub(url_pattern, lambda m: replace_match(m, "URL"), sanitized_text)

    # 3. Phones: (\+977[-\s]?)?\d{10}
    phone_pattern = r'(\+977[-\s]?)?\d{10}'
    sanitized_text = re.sub(phone_pattern, lambda m: replace_match(m, "PHONE"), sanitized_text)

    # 4. Person names: spaCy en_core_web_sm PERSON entities
    doc = nlp(sanitized_text)
    
    new_text = []
    last_idx = 0
    
    for ent in doc.ents:
        if ent.label_ == "PERSON":
            original = ent.text
            placeholder = f"[NAME_{counters['NAME']}]"
            mapping_dict[placeholder] = original
            counters["NAME"] += 1
            
            new_text.append(sanitized_text[last_idx:ent.start_char])
            new_text.append(placeholder)
            last_idx = ent.end_char

    new_text.append(sanitized_text[last_idx:])
    sanitized_text = "".join(new_text)

    return sanitized_text, mapping_dict

def restore(sanitized: str, mapping: Dict[str, str]) -> str:
    restored_text = sanitized
    for placeholder, original in mapping.items():
        restored_text = restored_text.replace(placeholder, original)
        
    return restored_text

if __name__ == "__main__":
    sample_text = "My name is Ram Bahadur and my email is ram@example.com. You can call me at +977-9841234567 or visit https://ram.com.np. Sita was also there."
    print("Original:", sample_text)
    sanitized, mapping = scrub(sample_text)
    print("Sanitized:", sanitized)
    print("Mapping:", mapping)
    restored = restore(sanitized, mapping)
    print("Restored:", restored)
    assert restored == sample_text
