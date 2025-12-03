import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../App";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { ArrowLeft, Trash2, Plus, Minus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

export default function CartPage({ user, setUser }) {
  const navigate = useNavigate();
  const [cart, setCart] = useState({ items: [] });
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    if (!user) {
      toast.error("Please login to view cart");
      navigate("/");
      return;
    }
    loadCart();
    setDeliveryAddress(user.address || "");
  }, [user]);

  const loadCart = async () => {
    try {
      const response = await api.get("/cart");
      setCart(response.data);
    } catch (error) {
      console.error("Error loading cart:", error);
      toast.error("Failed to load cart");
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (menuItemId, newQuantity) => {
    if (newQuantity < 1) {
      await removeItem(menuItemId);
      return;
    }

    try {
      await api.put("/cart/update", {
        menu_item_id: menuItemId,
        quantity: newQuantity
      });
      await loadCart();
    } catch (error) {
      toast.error("Failed to update quantity");
    }
  };

  const removeItem = async (menuItemId) => {
    try {
      await api.delete(`/cart/remove/${menuItemId}`);
      await loadCart();
      toast.success("Item removed from cart");
    } catch (error) {
      toast.error("Failed to remove item");
    }
  };

  const placeOrder = async () => {
    if (!deliveryAddress.trim()) {
      toast.error("Please enter delivery address");
      return;
    }

    if (cart.items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    setPlacing(true);
    try {
      const response = await api.post("/orders", {
        delivery_address: deliveryAddress
      });
      toast.success("Order placed successfully!");
      navigate("/orders");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to place order");
    } finally {
      setPlacing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading cart...</p>
        </div>
      </div>
    );
  }

  const total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryFee = total > 0 ? 3.99 : 0;
  const grandTotal = total + deliveryFee;

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
            Continue Shopping
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-8" style={{ fontFamily: 'Work Sans' }}>
          <ShoppingBag className="inline-block w-10 h-10 mr-3 text-orange-500" />
          Your Cart
        </h1>

        {cart.items.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="max-w-md mx-auto space-y-4">
              <ShoppingBag className="w-24 h-24 mx-auto text-gray-300" />
              <h2 className="text-2xl font-bold text-gray-700">Your cart is empty</h2>
              <p className="text-gray-500">Add some delicious items to get started!</p>
              <Button
                data-testid="browse-restaurants-button"
                onClick={() => navigate("/")}
                className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-8 mt-4"
              >
                Browse Restaurants
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cart.items.map((item) => (
                <Card key={item.menu_item_id} data-testid={`cart-item-${item.menu_item_id}`} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex gap-4">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-1" style={{ fontFamily: 'Work Sans' }}>
                        {item.name}
                      </h3>
                      <p className="text-lg text-orange-500 font-semibold mb-3">${item.price.toFixed(2)}</p>
                      
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-2">
                          <Button
                            data-testid={`decrease-quantity-${item.menu_item_id}`}
                            size="sm"
                            variant="ghost"
                            onClick={() => updateQuantity(item.menu_item_id, item.quantity - 1)}
                            className="h-8 w-8 p-0 rounded-full hover:bg-gray-200"
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <span className="w-8 text-center font-semibold" data-testid={`quantity-${item.menu_item_id}`}>
                            {item.quantity}
                          </span>
                          <Button
                            data-testid={`increase-quantity-${item.menu_item_id}`}
                            size="sm"
                            variant="ghost"
                            onClick={() => updateQuantity(item.menu_item_id, item.quantity + 1)}
                            className="h-8 w-8 p-0 rounded-full hover:bg-gray-200"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <Button
                          data-testid={`remove-item-${item.menu_item_id}`}
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.menu_item_id)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-gray-900">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="p-6 sticky top-8 space-y-6">
                <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Work Sans' }}>
                  Order Summary
                </h2>
                
                <div className="space-y-3 pt-4 border-t border-gray-200">
                  <div className="flex justify-between text-gray-700">
                    <span>Subtotal</span>
                    <span className="font-semibold" data-testid="subtotal">${total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>Delivery Fee</span>
                    <span className="font-semibold" data-testid="delivery-fee">${deliveryFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold text-gray-900 pt-3 border-t border-gray-200">
                    <span>Total</span>
                    <span className="text-orange-500" data-testid="grand-total">${grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-gray-200">
                  <Label htmlFor="delivery-address" className="text-base font-semibold">Delivery Address</Label>
                  <Input
                    id="delivery-address"
                    data-testid="delivery-address-input"
                    type="text"
                    placeholder="Enter delivery address"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="border-gray-300"
                  />
                </div>

                <Button
                  data-testid="place-order-button"
                  onClick={placeOrder}
                  disabled={placing || cart.items.length === 0}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white text-lg h-12 rounded-full shadow-lg"
                >
                  {placing ? "Placing Order..." : "Place Order"}
                </Button>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
