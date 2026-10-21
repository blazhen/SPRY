# Checks a .docx: valid zip, well-formed XML, counts. Usage: python -I check-docx.py <file.docx>
import re
import sys
import zipfile
import xml.dom.minidom as minidom

path = sys.argv[1]
z = zipfile.ZipFile(path)
print("zip test (None means fine):", z.testzip())
for name in z.namelist():
    minidom.parseString(z.read(name))
print("all parts are well-formed XML:", z.namelist())
doc = z.read("word/document.xml").decode("utf8")
text = re.sub(r"<[^>]+>", "", doc)
print("paragraphs:", doc.count("<w:p>") + doc.count("<w:p "))
print("tables:", doc.count("<w:tbl>"))
print("message headings:", doc.count('w:val="Heading2"'))
print("em or en dashes:", text.count(chr(0x2014)) + text.count(chr(0x2013)))
low = text.lower()
print("vendor words:", [w for w in ("highlevel", "gohighlevel", "leadconnector", "slack") if w in low])
print("first message heading text present:", "X-ACK-01" in text and "C-CLOSE-01" in text)
