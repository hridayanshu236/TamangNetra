import spacy
from typing import Dict, List

# Load the spacy English model
nlp = spacy.load("en_core_web_sm")

def build_glossary(text: str) -> Dict[str, List[str]]:
    """
    Extract PERSON, ORG, and GPE entities from text using spaCy.
    Deduplicates entities using a lowercase subset comparison to preserve proper nouns
    for translation context (e.g. 'Ram' is deduplicated if 'Ram Bahadur' is present).
    """
    doc = nlp(text)
    
    # Collect all entities by label
    raw_entities = {
        "PERSON": [],
        "ORG": [],
        "GPE": [],
    }
    
    for ent in doc.ents:
        label = ent.label_
        if label in raw_entities:
            raw_entities[label].append(ent.text)
            
    glossary: Dict[str, List[str]] = {
        "PERSON": [],
        "ORG": [],
        "GPE": [],
    }
    
    for label, texts in raw_entities.items():
        # Sort by length descending, so we process the most descriptive entities first
        sorted_texts = sorted(texts, key=len, reverse=True)
        
        accepted_entities = []
        for text in sorted_texts:
            lower_words = set(text.lower().split())
            
            # Check if this entity's words are a subset of any already accepted entity
            is_subset = False
            for accepted in accepted_entities:
                accepted_words = set(accepted.lower().split())
                if lower_words.issubset(accepted_words):
                    is_subset = True
                    break
                    
            if not is_subset:
                accepted_entities.append(text)
                
        glossary[label] = accepted_entities
                
    return glossary

if __name__ == "__main__":
    sample_text = (
        "Ram Bahadur works at UNDP in Kathmandu. "
        "ram bahadur previously visited New York for an UN conference."
    )
    print("Sample Text:")
    print(sample_text)
    print("-" * 40)
    
    glossary = build_glossary(sample_text)
    
    import json
    print("Extracted Glossary:")
    print(json.dumps(glossary, indent=2))
