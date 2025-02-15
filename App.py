from flask import Flask, jsonify
from datetime import datetime, timedelta
from pymongo import MongoClient

app = Flask(__name__)

client = MongoClient("mongodb://localhost:27017/")
db = client["zero_waste_kitchen"]
dishes_collection = db["dishes"]
user_collection = db["user_ingredients"]

@app.route('/api/suggest_dishes/<user_id>', methods=['GET'])
def suggest_dishes(user_id):
    # Fetch user data
    user_data = user_collection.find_one({"user_id": user_id})
    if not user_data:
        return jsonify({"error": "User not found"}), 404

    ingredients = user_data.get("ingredients", [])
    expiry_dates = user_data.get("expiry_dates", [])

    # Function to parse expiry dates safely
    def safe_parse_date(date_str):
        try:
            return datetime.strptime(date_str, "%d-%m-%Y")
        except ValueError:
            return None

    current_date = datetime.now()
    
    # Pair ingredients with expiry dates and filter out expired items
    valid_ingredients = [
        ingredient for ingredient, date in zip(ingredients, expiry_dates)
        if (parsed_date := safe_parse_date(date)) and current_date <= parsed_date <= current_date + timedelta(days=28)
    ]

    if not valid_ingredients:
        return jsonify({"suggested_dishes": [], "message": "No valid ingredients found"}), 200

    # Query dishes containing any of the valid ingredients
    matching_dishes = list(dishes_collection.find({"ingredients": {"$in": valid_ingredients}}))

    # Extract dish names & remove duplicates
    suggested_dishes = list({dish["name"] for dish in matching_dishes})

    return jsonify({"suggested_dishes": suggested_dishes})

if __name__ == '__main__':
    app.run(debug=True)
