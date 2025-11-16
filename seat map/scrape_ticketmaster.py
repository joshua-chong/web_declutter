from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
import json
import time

URL = "https://www.ticketmaster.co.uk/foo-fighters-hospitality-liverpool-27-06-2026/event/3E00636CCF0072C1"

def wait_for_full_seatmap(page):
    """
    Wait for lazy-loaded seats. Ticketmaster loads only ~30 circles first,
    then thousands once the map initializes. Wait for >200 circles.
    """
    last = 0
    stable = 0

    while True:
        count = page.locator("circle[data-component='svg__seat']").count()

        if count > 200:  # full map is now loaded
            return

        if count == last:
            stable += 1
        else:
            stable = 0

        last = count
        time.sleep(0.2)

        if stable > 20:
            return


def extract_seatmap_structure(html):
    soup = BeautifulSoup(html, "html.parser")

    sections = soup.find_all("g", {"data-component": "svg_block"})
    output = []

    for section in sections:
        section_name = section.get("data-section-name")
        section_id = section.get("data-section-id")

        rows_json = []

        # Only direct children represent rows
        rows = section.find_all("g", recursive=False)

        for row in rows:
            row_name = row.get("data-row-name")
            if not row_name:
                continue

            seats_json = []

            seats = row.find_all("circle", {"data-component": "svg__seat"})
            for seat in seats:
                seats_json.append({
                    "seat_id": seat.get("id"),
                    "seat_name": seat.get("data-seat-name"),
                    "type": seat.get("type"),
                    "cx": seat.get("cx"),
                    "cy": seat.get("cy"),
                    "r": seat.get("r"),
                })

            rows_json.append({
                "row_name": row_name,
                "seats": seats_json
            })

        output.append({
            "section_name": section_name,
            "section_id": section_id,
            "rows": rows_json
        })

    return output


# ----------------------------
# MAIN SCRAPER PIPELINE
# ----------------------------

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    page = browser.new_page()
    page.goto(URL, wait_until="domcontentloaded")

    # Wait for SVG to appear
    page.wait_for_selector("svg", timeout=30000)

    # Wait for full lazy-loaded seatmap
    wait_for_full_seatmap(page)

    # Grab the final DOM
    html = page.content()

    browser.close()


# Parse the seatmap to nested JSON
result = extract_seatmap_structure(html)

# Save JSON
with open("ticketmaster_seats.json", "w") as f:
    json.dump(result, f, indent=2)

print("🎉 DONE — seatmap exported to ticketmaster_seats.json")
