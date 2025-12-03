import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { api } from "../App";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { ArrowLeft, Star, Clock, Plus, Minus, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function RestaurantPage({ user, setUser }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [quantities, setQuantities] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRestaurantData();
  }, [id]);

  const loadRestaurantData = async () => {
    try {
      const [restaurantRes, menuRes] = await Promise.all([
        axios.get(`${API}/restaurants/${id}`),
        axios.get(`${API}/restaurants/${id}/menu`)
      ]);
      setRestaurant(restaurantRes.data);
      setMenuItems(menuRes.data);
    } catch (error) {
      console.error("Error loading restaurant data:", error);
      toast.error("Failed to load restaurant");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (menuItem) => {
    if (!user) {
      toast.error("Please login to add items to cart");
      navigate("/");
      return;
    }

    const quantity = quantities[menuItem.id] || 1;
    
    try {
      await api.post("/cart/add", {
        menu_item_id: menuItem.id,
        quantity: quantity,
        restaurant_id: restaurant.id
      });
      toast.success(`Added ${menuItem.name} to cart`);
      setQuantities({ ...quantities, [menuItem.id]: 1 });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to add to cart");
    }
  };

  const updateQuantity = (itemId, delta) => {
    const current = quantities[itemId] || 1;
    const newQuantity = Math.max(1, current + delta);
    setQuantities({ ...quantities, [itemId]: newQuantity });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading restaurant...</p>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 text-lg mb-4">Restaurant not found</p>
          <Button onClick={() => navigate("/")} className="bg-orange-500 hover:bg-orange-600 text-white">
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  const categories = ["All", ...new Set(menuItems.map(item => item.category))];
  const filteredMenu = selectedCategory === "All" 
    ? menuItems 
    : menuItems.filter(item => item.category === selectedCategory);

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-orange-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Button
            data-testid="back-button"
            variant="ghost"
            onClick={() => navigate("/")}
            className="text-gray-600 hover:text-orange-600 hover:bg-orange-50"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Restaurants
          </Button>
        </div>
      </div>

      {/* Restaurant Hero */}
      <div className="relative h-80 overflow-hidden">
        <img
          src={restaurant.image}
          alt={restaurant.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
          <div className="max-w-7xl mx-auto">
            <Badge className="bg-white text-gray-800 mb-3 px-3 py-1">
              <Star className="w-4 h-4 mr-1 text-yellow-500 fill-yellow-500" />
              {restaurant.rating}
            </Badge>
            <h1 className="text-4xl sm:text-5xl font-bold mb-2" style={{ fontFamily: 'Work Sans' }}>
              {restaurant.name}
            </h1>
            <p className="text-lg text-gray-200 mb-3">{restaurant.description}</p>
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                {restaurant.delivery_time}
              </div>
              <div>Min order: ${restaurant.min_order}</div>
              <Badge className="bg-orange-500 hover:bg-orange-600">{restaurant.cuisine_type}</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="sticky top-0 z-40 bg-white shadow-sm border-b border-orange-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map((category) => (
              <Button
                key={category}
                data-testid={`category-filter-${category.toLowerCase()}`}
                variant={selectedCategory === category ? "default" : "outline"}
                onClick={() => setSelectedCategory(category)}
                className={`rounded-full px-6 whitespace-nowrap ${
                  selectedCategory === category
                    ? "bg-orange-500 hover:bg-orange-600 text-white shadow-lg"
                    : "border-orange-300 text-gray-700 hover:bg-orange-50"
                }`}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-8" style={{ fontFamily: 'Work Sans' }}>
          {selectedCategory === "All" ? "All Items" : selectedCategory}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 fade-in">
          {filteredMenu.map((item) => (
            <Card
              key={item.id}
              data-testid={`menu-item-${item.id}`}
              className="overflow-hidden border-2 border-gray-100 hover:border-orange-300 hover:shadow-xl transition-all rounded-2xl"
            >
              <div className="relative h-48 overflow-hidden">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
                {!item.available && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="text-white font-semibold">Not Available</span>
                  </div>
                )}
              </div>
              
              <div className="p-5 space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1" style={{ fontFamily: 'Work Sans' }}>
                    {item.name}
                  </h3>
                  <p className="text-gray-600 text-sm line-clamp-2">{item.description}</p>
                </div>
                
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <span className="text-2xl font-bold text-orange-500">${item.price.toFixed(2)}</span>
                  {item.available && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 bg-gray-100 rounded-full px-2 py-1">
                        <Button
                          data-testid={`decrease-quantity-${item.id}`}
                          size="sm"
                          variant="ghost"
                          onClick={() => updateQuantity(item.id, -1)}
                          className="h-8 w-8 p-0 rounded-full hover:bg-gray-200"
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="w-8 text-center font-semibold" data-testid={`quantity-${item.id}`}>
                          {quantities[item.id] || 1}
                        </span>
                        <Button
                          data-testid={`increase-quantity-${item.id}`}
                          size="sm"
                          variant="ghost"
                          onClick={() => updateQuantity(item.id, 1)}
                          className="h-8 w-8 p-0 rounded-full hover:bg-gray-200"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <Button
                        data-testid={`add-to-cart-${item.id}`}
                        onClick={() => handleAddToCart(item)}
                        className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-4 shadow-lg"
                      >
                        <ShoppingCart className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Floating Cart Button */}
      {user && (
        <div className="fixed bottom-8 right-8 z-50">
          <Button
            data-testid="floating-cart-button"
            onClick={() => navigate("/cart")}
            className="bg-orange-500 hover:bg-orange-600 text-white rounded-full w-16 h-16 shadow-2xl flex items-center justify-center"
          >
            <ShoppingCart className="w-7 h-7" />
          </Button>
        </div>
      )}
    </div>
  );
}
