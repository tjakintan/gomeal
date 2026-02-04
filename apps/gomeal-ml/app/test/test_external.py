import sys
import os
import json
from app.data.processed.process_data import get_dataset_files, load_datasets_grouped, extract_dataset_attributes

def main():
    files = get_dataset_files()
    df = load_datasets_grouped(files, 1)
    attributes = extract_dataset_attributes(df)

    output_file = os.path.join(os.path.dirname(__file__), "attributes.json")
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(attributes, f, indent=4)

if __name__ == "__main__":
    main()
