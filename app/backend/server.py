from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# ============ Models ============

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: str
    address: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    phone: str
    address: str
    role: str = "user"

class Restaurant(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    description: str
    image: str
    cuisine_type: str
    rating: float
    delivery_time: str
    min_order: float

class MenuItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    restaurant_id: str
    name: str
    description: str
    price: float
    image: str
    category: str
    available: bool = True

class CartItem(BaseModel):
    menu_item_id: str
    quantity: int
    restaurant_id: str

class AddToCart(BaseModel):
    menu_item_id: str
    quantity: int = 1
    restaurant_id: str

class UpdateCartItem(BaseModel):
    menu_item_id: str
    quantity: int

class Cart(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    items: List[CartItem]

class OrderItem(BaseModel):
    menu_item_id: str
    name: str
    price: float
    quantity: int

class CreateOrder(BaseModel):
    delivery_address: str
    payment_method: str = "card"

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    restaurant_id: str
    restaurant_name: str
    items: List[OrderItem]
    total_amount: float
    status: str
    delivery_address: str
    created_at: str

# ============ Helper Functions ============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str) -> str:
    payload = {
        'user_id': user_id,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get('user_id')
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============ Auth Routes ============

@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_id = str(uuid.uuid4())
    hashed_pwd = hash_password(user_data.password)
    
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "password": hashed_pwd,
        "name": user_data.name,
        "phone": user_data.phone,
        "address": user_data.address,
        "role": "user"
    }
    
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id)
    
    return {
        "token": token,
        "user": {
            "id": user_id,
            "email": user_data.email,
            "name": user_data.name,
            "phone": user_data.phone,
            "address": user_data.address
        }
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    # Find user
    user = await db.users.find_one({"email": credentials.email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Verify password
    if not verify_password(credentials.password, user['password']):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_token(user['id'])
    
    return {
        "token": token,
        "user": {
            "id": user['id'],
            "email": user['email'],
            "name": user['name'],
            "phone": user['phone'],
            "address": user['address']
        }
    }

@api_router.get("/auth/me")
async def get_me(user_id: str = Depends(get_current_user)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# ============ Restaurant Routes ============

@api_router.get("/restaurants", response_model=List[Restaurant])
async def get_restaurants(search: Optional[str] = None, cuisine: Optional[str] = None):
    query = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    if cuisine:
        query["cuisine_type"] = cuisine
    
    restaurants = await db.restaurants.find(query, {"_id": 0}).to_list(1000)
    return restaurants

@api_router.get("/restaurants/{restaurant_id}", response_model=Restaurant)
async def get_restaurant(restaurant_id: str):
    restaurant = await db.restaurants.find_one({"id": restaurant_id}, {"_id": 0})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    return restaurant

# ============ Menu Routes ============

@api_router.get("/restaurants/{restaurant_id}/menu", response_model=List[MenuItem])
async def get_menu(restaurant_id: str, category: Optional[str] = None):
    query = {"restaurant_id": restaurant_id}
    if category:
        query["category"] = category
    
    menu_items = await db.menu_items.find(query, {"_id": 0}).to_list(1000)
    return menu_items

# ============ Cart Routes ============

@api_router.get("/cart")
async def get_cart(user_id: str = Depends(get_current_user)):
    cart = await db.cart.find_one({"user_id": user_id}, {"_id": 0})
    if not cart:
        return {"user_id": user_id, "items": []}
    
    # Enrich cart items with full details
    enriched_items = []
    for item in cart.get("items", []):
        menu_item = await db.menu_items.find_one({"id": item["menu_item_id"]}, {"_id": 0})
        if menu_item:
            enriched_items.append({
                **item,
                "name": menu_item["name"],
                "price": menu_item["price"],
                "image": menu_item["image"]
            })
    
    return {"user_id": user_id, "items": enriched_items}

@api_router.post("/cart/add")
async def add_to_cart(item: AddToCart, user_id: str = Depends(get_current_user)):
    cart = await db.cart.find_one({"user_id": user_id})
    
    if not cart:
        # Create new cart
        cart = {
            "user_id": user_id,
            "items": [item.model_dump()]
        }
        await db.cart.insert_one(cart)
    else:
        # Check if item already in cart
        items = cart.get("items", [])
        found = False
        for cart_item in items:
            if cart_item["menu_item_id"] == item.menu_item_id:
                cart_item["quantity"] += item.quantity
                found = True
                break
        
        if not found:
            items.append(item.model_dump())
        
        await db.cart.update_one(
            {"user_id": user_id},
            {"$set": {"items": items}}
        )
    
    return {"message": "Item added to cart"}

@api_router.put("/cart/update")
async def update_cart_item(item: UpdateCartItem, user_id: str = Depends(get_current_user)):
    cart = await db.cart.find_one({"user_id": user_id})
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    
    items = cart.get("items", [])
    for cart_item in items:
        if cart_item["menu_item_id"] == item.menu_item_id:
            cart_item["quantity"] = item.quantity
            break
    
    await db.cart.update_one(
        {"user_id": user_id},
        {"$set": {"items": items}}
    )
    
    return {"message": "Cart updated"}

@api_router.delete("/cart/remove/{menu_item_id}")
async def remove_from_cart(menu_item_id: str, user_id: str = Depends(get_current_user)):
    cart = await db.cart.find_one({"user_id": user_id})
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    
    items = [item for item in cart.get("items", []) if item["menu_item_id"] != menu_item_id]
    
    await db.cart.update_one(
        {"user_id": user_id},
        {"$set": {"items": items}}
    )
    
    return {"message": "Item removed from cart"}

@api_router.delete("/cart/clear")
async def clear_cart(user_id: str = Depends(get_current_user)):
    await db.cart.update_one(
        {"user_id": user_id},
        {"$set": {"items": []}}
    )
    return {"message": "Cart cleared"}

# ============ Order Routes ============

@api_router.post("/orders")
async def create_order(order_data: CreateOrder, user_id: str = Depends(get_current_user)):
    # Get cart
    cart = await db.cart.find_one({"user_id": user_id})
    if not cart or not cart.get("items"):
        raise HTTPException(status_code=400, detail="Cart is empty")
    
    # Calculate total and prepare order items
    order_items = []
    total_amount = 0
    restaurant_id = None
    restaurant_name = None
    
    for cart_item in cart["items"]:
        menu_item = await db.menu_items.find_one({"id": cart_item["menu_item_id"]}, {"_id": 0})
        if menu_item:
            order_items.append({
                "menu_item_id": menu_item["id"],
                "name": menu_item["name"],
                "price": menu_item["price"],
                "quantity": cart_item["quantity"]
            })
            total_amount += menu_item["price"] * cart_item["quantity"]
            
            if not restaurant_id:
                restaurant_id = menu_item["restaurant_id"]
                restaurant = await db.restaurants.find_one({"id": restaurant_id}, {"_id": 0})
                restaurant_name = restaurant["name"] if restaurant else "Unknown"
    
    # Create order
    order_id = str(uuid.uuid4())
    order_doc = {
        "id": order_id,
        "user_id": user_id,
        "restaurant_id": restaurant_id,
        "restaurant_name": restaurant_name,
        "items": order_items,
        "total_amount": total_amount,
        "status": "placed",
        "delivery_address": order_data.delivery_address,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.orders.insert_one(order_doc)
    
    # Clear cart
    await db.cart.update_one(
        {"user_id": user_id},
        {"$set": {"items": []}}
    )
    
    return {"order_id": order_id, "message": "Order placed successfully"}

@api_router.get("/orders", response_model=List[Order])
async def get_orders(user_id: str = Depends(get_current_user)):
    orders = await db.orders.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return orders

@api_router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str, user_id: str = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id, "user_id": user_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

# ============ Seed Data Route ============

@api_router.post("/seed-data")
async def seed_data():
    # Check if data already exists
    restaurant_count = await db.restaurants.count_documents({})
    if restaurant_count > 0:
        return {"message": "Data already seeded"}
    
    # Sample restaurants
    restaurants = [
        {
            "id": "rest1",
            "name": "The Burger House",
            "description": "Best burgers in town with premium ingredients",
            "image": "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800&h=600&fit=crop",
            "cuisine_type": "American",
            "rating": 4.5,
            "delivery_time": "25-35 min",
            "min_order": 10.0
        },
        {
            "id": "rest2",
            "name": "Pizza Paradise",
            "description": "Authentic Italian pizza baked in wood-fired oven",
            "image": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&h=600&fit=crop",
            "cuisine_type": "Italian",
            "rating": 4.8,
            "delivery_time": "30-40 min",
            "min_order": 15.0
        },
        {
            "id": "rest3",
            "name": "Sushi Master",
            "description": "Fresh sushi and Japanese cuisine",
            "image": "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800&h=600&fit=crop",
            "cuisine_type": "Japanese",
            "rating": 4.7,
            "delivery_time": "35-45 min",
            "min_order": 20.0
        },
        {
            "id": "rest4",
            "name": "Taco Fiesta",
            "description": "Authentic Mexican street food",
            "image": "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&h=600&fit=crop",
            "cuisine_type": "Mexican",
            "rating": 4.4,
            "delivery_time": "20-30 min",
            "min_order": 12.0
        },
        {
            "id": "rest5",
            "name": "Spice Garden",
            "description": "Aromatic Indian curries and tandoori",
            "image": "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&h=600&fit=crop",
            "cuisine_type": "Indian",
            "rating": 4.6,
            "delivery_time": "30-40 min",
            "min_order": 15.0
        },
        {
            "id": "rest6",
            "name": "Noodle Bar",
            "description": "Delicious Asian noodles and stir-fry",
            "image": "https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=800&h=600&fit=crop",
            "cuisine_type": "Asian",
            "rating": 4.3,
            "delivery_time": "20-30 min",
            "min_order": 10.0
        }
    ]
    
    # Sample menu items
    menu_items = [
        # Burger House
        {"id": "menu1", "restaurant_id": "rest1", "name": "Classic Burger", "description": "Beef patty, lettuce, tomato, cheese", "price": 12.99, "image": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop", "category": "Burgers", "available": True},
        {"id": "menu2", "restaurant_id": "rest1", "name": "Bacon Deluxe", "description": "Double patty, bacon, special sauce", "price": 15.99, "image": "https://images.unsplash.com/photo-1550547660-d9450f859349?w=400&h=300&fit=crop", "category": "Burgers", "available": True},
        {"id": "menu3", "restaurant_id": "rest1", "name": "Crispy Fries", "description": "Golden french fries", "price": 4.99, "image": "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&h=300&fit=crop", "category": "Sides", "available": True},
        {"id": "menu4", "restaurant_id": "rest1", "name": "Onion Rings", "description": "Crispy fried onion rings", "price": 5.99, "image": "https://images.unsplash.com/photo-1639024471283-03518883512d?w=400&h=300&fit=crop", "category": "Sides", "available": True},
        
        # Pizza Paradise
        {"id": "menu5", "restaurant_id": "rest2", "name": "Margherita Pizza", "description": "Tomato, mozzarella, basil", "price": 14.99, "image": "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=300&fit=crop", "category": "Pizza", "available": True},
        {"id": "menu6", "restaurant_id": "rest2", "name": "Pepperoni Pizza", "description": "Classic pepperoni and cheese", "price": 16.99, "image": "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400&h=300&fit=crop", "category": "Pizza", "available": True},
        {"id": "menu7", "restaurant_id": "rest2", "name": "Caesar Salad", "description": "Fresh romaine, parmesan, croutons", "price": 8.99, "image": "https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400&h=300&fit=crop", "category": "Salads", "available": True},
        
        # Sushi Master
        {"id": "menu8", "restaurant_id": "rest3", "name": "California Roll", "description": "Crab, avocado, cucumber", "price": 11.99, "image": "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400&h=300&fit=crop", "category": "Rolls", "available": True},
        {"id": "menu9", "restaurant_id": "rest3", "name": "Spicy Tuna Roll", "description": "Spicy tuna, cucumber, sriracha", "price": 13.99, "image": "https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=400&h=300&fit=crop", "category": "Rolls", "available": True},
        {"id": "menu10", "restaurant_id": "rest3", "name": "Miso Soup", "description": "Traditional Japanese soup", "price": 4.99, "image": "https://images.unsplash.com/photo-1547548061-9d2eeec21eef?w=400&h=300&fit=crop", "category": "Appetizers", "available": True},
        
        # Taco Fiesta
        {"id": "menu11", "restaurant_id": "rest4", "name": "Beef Tacos", "description": "3 tacos with seasoned beef", "price": 9.99, "image": "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&h=300&fit=crop", "category": "Tacos", "available": True},
        {"id": "menu12", "restaurant_id": "rest4", "name": "Chicken Burrito", "description": "Large burrito with grilled chicken", "price": 11.99, "image": "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400&h=300&fit=crop", "category": "Burritos", "available": True},
        {"id": "menu13", "restaurant_id": "rest4", "name": "Nachos Supreme", "description": "Loaded nachos with all toppings", "price": 10.99, "image": "https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=400&h=300&fit=crop", "category": "Appetizers", "available": True},
        
        # Spice Garden
        {"id": "menu14", "restaurant_id": "rest5", "name": "Butter Chicken", "description": "Creamy tomato curry with chicken", "price": 14.99, "image": "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400&h=300&fit=crop", "category": "Curry", "available": True},
        {"id": "menu15", "restaurant_id": "rest5", "name": "Tandoori Chicken", "description": "Marinated and grilled chicken", "price": 13.99, "image": "https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=400&h=300&fit=crop", "category": "Tandoori", "available": True},
        {"id": "menu16", "restaurant_id": "rest5", "name": "Garlic Naan", "description": "Fresh baked bread with garlic", "price": 3.99, "image": "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=300&fit=crop", "category": "Breads", "available": True},
        
        # Noodle Bar
        {"id": "menu17", "restaurant_id": "rest6", "name": "Pad Thai", "description": "Thai rice noodles with shrimp", "price": 12.99, "image": "https://images.unsplash.com/photo-1559314809-0d155014e29e?w=400&h=300&fit=crop", "category": "Noodles", "available": True},
        {"id": "menu18", "restaurant_id": "rest6", "name": "Ramen Bowl", "description": "Japanese noodle soup", "price": 13.99, "image": "https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=400&h=300&fit=crop", "category": "Noodles", "available": True},
        {"id": "menu19", "restaurant_id": "rest6", "name": "Spring Rolls", "description": "Fresh vegetable spring rolls", "price": 6.99, "image": "https://images.unsplash.com/photo-1594756202469-9ff9799dd03b?w=400&h=300&fit=crop", "category": "Appetizers", "available": True}
    ]
    
    await db.restaurants.insert_many(restaurants)
    await db.menu_items.insert_many(menu_items)
    
    return {"message": "Data seeded successfully"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
