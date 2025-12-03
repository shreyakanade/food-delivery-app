import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { api } from "../App";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Label } from "../components/ui/label";
import { ShoppingCart, Search, Clock, Star, UtensilsCrossed, User, LogOut, Package } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function HomePage({ user, setUser }) {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCuisine, setSelectedCuisine] = useState("All");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [loading, setLoading] = useState(false);
  
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    email: "",
    password: "",
    name: "",
    phone: "",
    address: ""
  });

  useEffect(() => {
    loadRestaurants();
  }, []);

  const loadRestaurants = async () => {
    try {
      const response = await axios.get(`${API}/restaurants`);
      setRestaurants(response.data);
    } catch (error) {
      console.error("Error loading restaurants:", error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/login`, loginForm);
      localStorage.setItem("token", response.data.token);
      setUser(response.data.user);
      setShowAuthModal(false);
      toast.success("Welcome back!");
      setLoginForm({ email: "", password: "" });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/register`, registerForm);
      localStorage.setItem("token", response.data.token);
      setUser(response.data.user);
      setShowAuthModal(false);
      toast.success("Account created successfully!");
      setRegisterForm({ email: "", password: "", name: "", phone: "", address: "" });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    toast.success("Logged out successfully");
  };

  const cuisineTypes = ["All", "American", "Italian", "Japanese", "Mexican", "Indian", "Asian"];

  const filteredRestaurants = restaurants.filter((restaurant) => {
    const matchesSearch = restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          restaurant.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCuisine = selectedCuisine === "All" || restaurant.cuisine_type === selectedCuisine;
    return matchesSearch && matchesCuisine;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      {/* Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-50 border-b border-orange-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center shadow-lg">
                <UtensilsCrossed className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-800" style={{ fontFamily: 'Work Sans' }}>FoodExpress</span>
            </div>
            
            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <Button
                    data-testid="orders-nav-button"
                    variant="ghost"
                    onClick={() => navigate("/orders")}
                    className="text-gray-700 hover:text-orange-600 hover:bg-orange-50"
                  >
                    <Package className="w-5 h-5 mr-2" />
                    Orders
                  </Button>
                  <Button
                    data-testid="cart-nav-button"
                    onClick={() => navigate("/cart")}
                    className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-6 shadow-lg"
                  >
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Cart
                  </Button>
                  <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-400 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-sm font-medium text-gray-700">{user.name}</span>
                    </div>
                    <Button
                      data-testid="logout-button"
                      variant="ghost"
                      size="sm"
                      onClick={handleLogout}
                      className="text-gray-500 hover:text-red-600"
                    >
                      <LogOut className="w-4 h-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <Button
                  data-testid="login-signup-button"
                  onClick={() => setShowAuthModal(true)}
                  className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-8 shadow-lg"
                >
                  Login / Sign Up
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-100 via-red-50 to-orange-100 opacity-50"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center space-y-6">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900" style={{ fontFamily: 'Work Sans' }}>
              Delicious Food,
              <span className="block text-orange-500 mt-2">Delivered Fast</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
              Order from your favorite restaurants and get it delivered to your doorstep
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto mt-8">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  data-testid="search-input"
                  type="text"
                  placeholder="Search for restaurants or cuisines..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-14 text-lg rounded-full border-2 border-orange-200 focus:border-orange-400 shadow-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cuisine Filter */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
          {cuisineTypes.map((cuisine) => (
            <Button
              key={cuisine}
              data-testid={`cuisine-filter-${cuisine.toLowerCase()}`}
              variant={selectedCuisine === cuisine ? "default" : "outline"}
              onClick={() => setSelectedCuisine(cuisine)}
              className={`rounded-full px-6 whitespace-nowrap ${
                selectedCuisine === cuisine
                  ? "bg-orange-500 hover:bg-orange-600 text-white shadow-lg"
                  : "border-orange-300 text-gray-700 hover:bg-orange-50"
              }`}
            >
              {cuisine}
            </Button>
          ))}
        </div>
      </section>

      {/* Restaurants Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
        <h2 className="text-3xl font-bold text-gray-900 mb-8" style={{ fontFamily: 'Work Sans' }}>
          {selectedCuisine === "All" ? "All Restaurants" : `${selectedCuisine} Restaurants`}
        </h2>
        
        {filteredRestaurants.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">No restaurants found matching your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 fade-in">
            {filteredRestaurants.map((restaurant) => (
              <Card
                key={restaurant.id}
                data-testid={`restaurant-card-${restaurant.id}`}
                onClick={() => navigate(`/restaurant/${restaurant.id}`)}
                className="restaurant-card cursor-pointer overflow-hidden border-2 border-transparent hover:border-orange-300 rounded-2xl shadow-md"
              >
                <div className="relative h-52 overflow-hidden">
                  <img
                    src={restaurant.image}
                    alt={restaurant.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-white text-gray-800 shadow-lg border-0 px-3 py-1">
                      <Star className="w-4 h-4 mr-1 text-yellow-500 fill-yellow-500" />
                      {restaurant.rating}
                    </Badge>
                  </div>
                </div>
                
                <div className="p-6 space-y-3">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1" style={{ fontFamily: 'Work Sans' }}>
                      {restaurant.name}
                    </h3>
                    <p className="text-gray-600 text-sm line-clamp-2">{restaurant.description}</p>
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-200">
                      {restaurant.cuisine_type}
                    </Badge>
                    <div className="flex items-center text-gray-600 text-sm">
                      <Clock className="w-4 h-4 mr-1" />
                      {restaurant.delivery_time}
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-500">
                    Min order: <span className="font-semibold text-gray-700">${restaurant.min_order}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Auth Modal */}
      <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold" style={{ fontFamily: 'Work Sans' }}>
              {authMode === "login" ? "Welcome Back" : "Create Account"}
            </DialogTitle>
            <DialogDescription>
              {authMode === "login" ? "Login to your account to continue" : "Sign up to start ordering"}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={authMode} onValueChange={setAuthMode}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" data-testid="login-tab">Login</TabsTrigger>
              <TabsTrigger value="register" data-testid="register-tab">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    data-testid="login-email-input"
                    type="email"
                    placeholder="your@email.com"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    data-testid="login-password-input"
                    type="password"
                    placeholder="••••••••"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    required
                  />
                </div>
                <Button
                  data-testid="login-submit-button"
                  type="submit"
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                  disabled={loading}
                >
                  {loading ? "Logging in..." : "Login"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="register-name">Full Name</Label>
                  <Input
                    id="register-name"
                    data-testid="register-name-input"
                    type="text"
                    placeholder="John Doe"
                    value={registerForm.name}
                    onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-email">Email</Label>
                  <Input
                    id="register-email"
                    data-testid="register-email-input"
                    type="email"
                    placeholder="your@email.com"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password">Password</Label>
                  <Input
                    id="register-password"
                    data-testid="register-password-input"
                    type="password"
                    placeholder="••••••••"
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-phone">Phone</Label>
                  <Input
                    id="register-phone"
                    data-testid="register-phone-input"
                    type="tel"
                    placeholder="+1 234 567 8900"
                    value={registerForm.phone}
                    onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-address">Delivery Address</Label>
                  <Input
                    id="register-address"
                    data-testid="register-address-input"
                    type="text"
                    placeholder="123 Main St, City, State"
                    value={registerForm.address}
                    onChange={(e) => setRegisterForm({ ...registerForm, address: e.target.value })}
                    required
                  />
                </div>
                <Button
                  data-testid="register-submit-button"
                  type="submit"
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                  disabled={loading}
                >
                  {loading ? "Creating account..." : "Sign Up"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
