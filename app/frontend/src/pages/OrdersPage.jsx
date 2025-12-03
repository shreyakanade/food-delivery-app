import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../App";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { ArrowLeft, Package, Clock, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function OrdersPage({ user, setUser }) {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      toast.error("Please login to view orders");
      navigate("/");
      return;
    }
    loadOrders();
  }, [user]);

  const loadOrders = async () => {
    try {
      const response = await api.get("/orders");
      setOrders(response.data);
    } catch (error) {
      console.error("Error loading orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "placed":
        return <Clock className="w-5 h-5" />;
      case "preparing":
        return <Package className="w-5 h-5" />;
      case "delivered":
        return <CheckCircle className="w-5 h-5" />;
      default:
        return <Package className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "placed":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "preparing":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "delivered":
        return "bg-green-100 text-green-700 border-green-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

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
            Back to Home
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-8" style={{ fontFamily: 'Work Sans' }}>
          <Package className="inline-block w-10 h-10 mr-3 text-orange-500" />
          Your Orders
        </h1>

        {orders.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="max-w-md mx-auto space-y-4">
              <Package className="w-24 h-24 mx-auto text-gray-300" />
              <h2 className="text-2xl font-bold text-gray-700">No orders yet</h2>
              <p className="text-gray-500">Start ordering from your favorite restaurants!</p>
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
          <div className="space-y-6">
            {orders.map((order) => (
              <Card key={order.id} data-testid={`order-${order.id}`} className="p-6 hover:shadow-lg transition-shadow">
                <div className="space-y-4">
                  {/* Order Header */}
                  <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-gray-200">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Work Sans' }}>
                          {order.restaurant_name}
                        </h3>
                        <Badge className={`${getStatusColor(order.status)} border`}>
                          {getStatusIcon(order.status)}
                          <span className="ml-2 capitalize">{order.status}</span>
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">
                        Order ID: <span className="font-mono">{order.id}</span>
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {formatDate(order.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-orange-500" data-testid={`order-total-${order.id}`}>
                        ${order.total_amount.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-gray-700">Items:</h4>
                    {order.items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center text-sm py-2 px-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-700">
                          {item.quantity}x {item.name}
                        </span>
                        <span className="font-semibold text-gray-900">
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Delivery Address */}
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold">Delivery Address:</span> {order.delivery_address}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
