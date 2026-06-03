import urllib.request, json

BASE = "http://localhost:8001"

def post(path, data):
    req = urllib.request.Request(
        f"{BASE}{path}",
        data=json.dumps(data).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

print("Seeding customers...")
customers = [
    {"full_name": "James Anderson",   "email": "james.anderson@example.com",   "phone": "555-0101"},
    {"full_name": "Sophia Martinez",  "email": "sophia.martinez@example.com",  "phone": "555-0102"},
    {"full_name": "Liam Thompson",    "email": "liam.thompson@example.com",    "phone": "555-0103"},
    {"full_name": "Olivia Robinson",  "email": "olivia.robinson@example.com",  "phone": "555-0104"},
    {"full_name": "Noah Wilson",      "email": "noah.wilson@example.com",      "phone": "555-0105"},
    {"full_name": "Emma Davis",       "email": "emma.davis@example.com",       "phone": "555-0106"},
    {"full_name": "William Taylor",   "email": "william.taylor@example.com",   "phone": "555-0107"},
    {"full_name": "Ava Harris",       "email": "ava.harris@example.com",       "phone": "555-0108"},
    {"full_name": "Mason Clark",      "email": "mason.clark@example.com",      "phone": "555-0109"},
    {"full_name": "Isabella Lewis",   "email": "isabella.lewis@example.com",   "phone": "555-0110"},
]
c_ids = [post("/customers", c)["id"] for c in customers]
print(f"  Created {len(c_ids)} customers")

print("Seeding products...")
products = [
    {"name": "USB-C Hub",               "sku": "USB-HUB-01",  "price": 49.99,  "quantity": 200, "description": "7-in-1 USB-C hub"},
    {"name": "Wireless Mouse",          "sku": "MOUSE-WL-01", "price": 39.99,  "quantity": 150, "description": "Ergonomic wireless mouse"},
    {"name": "Mechanical Keyboard",     "sku": "KB-MECH-01",  "price": 129.99, "quantity": 75,  "description": "TKL mechanical keyboard"},
    {"name": "Laptop Stand",            "sku": "STAND-LP-01", "price": 34.99,  "quantity": 120, "description": "Adjustable aluminium stand"},
    {"name": "Desk Mat",                "sku": "MAT-DESK-01", "price": 24.99,  "quantity": 180, "description": "XL desk mat, 90x40cm"},
    {"name": "HDMI Cable 2m",           "sku": "HDMI-2M-01",  "price": 12.99,  "quantity": 400, "description": "4K HDMI 2.0 cable"},
    {"name": "Webcam HD",               "sku": "CAM-HD-01",   "price": 79.99,  "quantity": 60,  "description": "1080p webcam with mic"},
    {"name": "Monitor Light Bar",       "sku": "LIGHT-MB-01", "price": 44.99,  "quantity": 0,   "description": "LED monitor light bar"},
    {"name": "Wireless Charging Pad",   "sku": "CHG-WL-01",   "price": 29.99,  "quantity": 8,   "description": "10W fast wireless charger"},
    {"name": "Blue Light Glasses",      "sku": "GLASS-BL-01", "price": 19.99,  "quantity": 5,   "description": "Anti blue light glasses"},
    {"name": "Cable Management Kit",    "sku": "CABLE-KIT-01","price": 14.99,  "quantity": 300, "description": "Velcro + clips bundle"},
    {"name": "USB-C to USB-A Adapter",  "sku": "ADP-CA-01",   "price": 9.99,   "quantity": 250, "description": "Pack of 2 adapters"},
    {"name": "Screen Cleaning Kit",     "sku": "CLEAN-SC-01", "price": 7.99,   "quantity": 200, "description": "Spray + microfibre cloth"},
    {"name": "Noise Cancelling Headset","sku": "HEAD-NC-01",  "price": 149.99, "quantity": 40,  "description": "Over-ear ANC headset"},
    {"name": "Portable SSD 1TB",        "sku": "SSD-1TB-01",  "price": 99.99,  "quantity": 55,  "description": "USB-C portable SSD"},
    {"name": "4K Monitor 27\"",         "sku": "MON-4K-27",   "price": 399.99, "quantity": 20,  "description": "27-inch 4K IPS monitor"},
    {"name": "Laptop Sleeve 15\"",      "sku": "SLEEVE-15-01","price": 22.99,  "quantity": 90,  "description": "Neoprene laptop sleeve"},
    {"name": "Surge Protector 6-port",  "sku": "SURGE-6P-01", "price": 27.99,  "quantity": 110, "description": "6-outlet surge protector"},
    {"name": "Mini DisplayPort Cable",  "sku": "MDP-1M-01",   "price": 11.99,  "quantity": 130, "description": "1m mDP to HDMI cable"},
    {"name": "Ergonomic Wrist Rest",    "sku": "WRIST-ER-01", "price": 17.99,  "quantity": 95,  "description": "Memory foam wrist rest"},
]
p_ids = [post("/products", p)["id"] for p in products]
print(f"  Created {len(p_ids)} products")

print("Seeding orders...")
orders_data = [
    {"customer_id": c_ids[0], "items": [{"product_id": p_ids[0], "quantity": 2}, {"product_id": p_ids[1], "quantity": 1}]},
    {"customer_id": c_ids[1], "items": [{"product_id": p_ids[2], "quantity": 1}]},
    {"customer_id": c_ids[2], "items": [{"product_id": p_ids[3], "quantity": 3}, {"product_id": p_ids[4], "quantity": 2}]},
    {"customer_id": c_ids[3], "items": [{"product_id": p_ids[5], "quantity": 5}]},
    {"customer_id": c_ids[4], "items": [{"product_id": p_ids[6], "quantity": 1}, {"product_id": p_ids[10], "quantity": 2}]},
    {"customer_id": c_ids[5], "items": [{"product_id": p_ids[13], "quantity": 1}]},
    {"customer_id": c_ids[6], "items": [{"product_id": p_ids[14], "quantity": 2}]},
    {"customer_id": c_ids[7], "items": [{"product_id": p_ids[11], "quantity": 4}, {"product_id": p_ids[12], "quantity": 3}]},
    {"customer_id": c_ids[8], "items": [{"product_id": p_ids[15], "quantity": 1}]},
    {"customer_id": c_ids[9], "items": [{"product_id": p_ids[16], "quantity": 2}, {"product_id": p_ids[19], "quantity": 1}]},
]
o_ids = [post("/orders", o)["id"] for o in orders_data]
print(f"  Created {len(o_ids)} orders")

print("Done! Database seeded successfully.")
