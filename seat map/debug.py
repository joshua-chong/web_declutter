import undetected_chromedriver as uc
from bs4 import BeautifulSoup
import time
import json

URL = "https://www.ticketmaster.co.uk/foo-fighters-hospitality-liverpool-27-06-2026/event/3E00636CCF0072C1"

driver = uc.Chrome(headless=False)
driver.get(URL)

# Wait for page JS to load fully
time.sleep(10)

# Scroll to trigger seatmap mount
driver.execute_script("window.scrollTo(0, document.body.scrollHeight / 2);")
time.sleep(5)

html = driver.page_source
driver.quit()

soup = BeautifulSoup(html, "html.parser")

sections = soup.find_all("g", {"data-component": "svg_block"})
print("Found sections:", len(sections))

for section in sections[:1]:
    print(section.get("data-section-name"))
