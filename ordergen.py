import os
import re
from datetime import datetime
import markdown

template = '''---
title: 最新文章
author: Maple-Kaede
---

# 最新文章
'''

def extract_date_from_meta(file_content):
    extensions = ["meta"]
    md = markdown.Markdown(extensions=extensions)
    md.convert(file_content)
    metadata = md.Meta
    if 'date' in metadata:
        date_str = metadata['date'][0]
        try:
            return datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            pass
    return None

def get_modification_date(file_path):
    return datetime.utcfromtimestamp(os.path.getmtime(file_path)).date()

def get_title(file_path):
    with open(file_path, 'r', encoding='utf-8') as file:
        file_content = file.read()
        extensions = ["meta"]
        md = markdown.Markdown(extensions=extensions)
        md.convert(file_content)
        metadata = md.Meta
        if 'title' in metadata:
            return metadata['title'][0]
    return '.'.join(os.path.basename(file_path).split('.')[:-1])

def generate_update_order(docs_path):
    files_with_dates = []

    for root, _, files in os.walk(docs_path):
        for file_name in files:
            if file_name.endswith(".md"):
                print(f"Processing file: {file_name}")
                file_path = os.path.join(root, file_name)
                with open(file_path, 'r', encoding='utf-8') as file:
                    file_content = file.read()
                    date_from_meta = extract_date_from_meta(file_content)
                    if date_from_meta:
                        title = get_title(file_path)
                        files_with_dates.append((date_from_meta, title, file_path))
                    else:
                        mod_date = get_modification_date(file_path)
                        title = get_title(file_path)
                        files_with_dates.append((mod_date, title, file_path))

    sorted_files = sorted(files_with_dates, key=lambda x: x[0], reverse=True)

    with open(os.path.join(docs_path, "UpdateOrder.md"), 'w', encoding='utf-8') as output_file:
        output_file.write(template)
        for date, title, file_path in sorted_files:
            relative_path = os.path.relpath(file_path, docs_path)
            output_file.write(f"* **{date.strftime('%Y-%m-%d')}**: [{title}]({relative_path.replace(os.sep, '/')})\n")

if __name__ == "__main__":
    docs_path = "docs"  # Change this to your actual path
    generate_update_order(docs_path)
    print("Finished list generation")