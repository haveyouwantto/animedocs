import os
import re

def count_chinese_characters(file_path):
    total_count = 0
    result_list = []

    # 如果是文件夹，则递归统计文件夹下所有.md文件的字数
    if os.path.isdir(file_path):
        for file_name in os.listdir(file_path):
            sub_path = os.path.join(file_path, file_name)
            sub_total, sub_result_list = count_chinese_characters(sub_path)
            total_count += sub_total
            result_list.extend(sub_result_list)
    
    # 如果是.md文件，则统计文件中的中文字符数
    elif os.path.isfile(file_path) and file_path.lower().endswith('.md'):
        with open(file_path, 'r', encoding='utf-8') as file:
            content = file.read()
            chinese_count = count_chinese_in_string(content)
            result_list.append((chinese_count, file_path))
            total_count += chinese_count
    
    return total_count, result_list

def count_chinese_in_string(s):
    chinese_pattern = re.compile('[\u4e00-\u9fff]')
    return len(re.findall(chinese_pattern, s))

# 请替换为你要统计的文件夹路径
folder_path = 'docs'
total_characters, result_list = count_chinese_characters(folder_path)

# 按字数排序输出
sorted_result = sorted(result_list, key=lambda x: x[0], reverse=True)
for chinese_count, file_path in sorted_result:
    print(f"{chinese_count:8d}\t{file_path}")

print(f"总计中文字符数：{total_characters} 个")
