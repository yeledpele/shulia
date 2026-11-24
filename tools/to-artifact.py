# Turn the single-file Vite build into an artifact page body (no doctype/html/head/body wrappers).
import re, sys
src = open(sys.argv[1], encoding='utf-8').read()
head = re.search(r'<head>(.*?)</head>', src, re.S).group(1)
body = re.search(r'<body>(.*?)</body>', src, re.S).group(1)
head = re.sub(r'<meta charset[^>]*>\s*', '', head)
head = re.sub(r'<meta name="viewport"[^>]*>\s*', '', head)
open(sys.argv[2], 'w', encoding='utf-8').write(head.strip() + '\n' + body.strip() + '\n')
