import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Package, CheckCircle, Clock, Plus, RefreshCw } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";

interface OrderStats {
  totalOrders: number;
  pendingOrders: number;
  deliveredOrders: number;
  totalRevenue: number;
  totalDeliveryBoys: number;
}

interface Order {
  _id: string;
  createdAt: string;
  status: string;
}

interface ChartDataItem {
  name: string;
  orders: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<OrderStats>({
    totalOrders: 0,
    pendingOrders: 0,
    deliveredOrders: 0,
    totalRevenue: 0,
    totalDeliveryBoys: 0,
  });
  const [loading, setLoading] = useState(true);
  const [chartView, setChartView] = useState<"week" | "month">("week");
  const [chartData, setChartData] = useState<ChartDataItem[]>([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    loadChartData();
  }, [chartView]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await api.getDashboard();
      setStats(data);
      loadChartData();
    } catch (error) {
      console.error("Failed to load dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadChartData = async () => {
    try {
      const response = await api.getOrders({ limit: 1000 });
      const orders: Order[] = response.orders || [];

      if (chartView === "week") {
        const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const weekData: ChartDataItem[] = weekdays.map((day, index) => {
          const dayDate = new Date(startOfWeek);
          dayDate.setDate(startOfWeek.getDate() + index);
          const nextDay = new Date(dayDate);
          nextDay.setDate(dayDate.getDate() + 1);

          const count = orders.filter((order) => {
            const orderDate = new Date(order.createdAt);
            return orderDate >= dayDate && orderDate < nextDay;
          }).length;

          return { name: day, orders: count };
        });

        setChartData(weekData);
      } else {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const weeksInMonth = Math.ceil(
          (new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() +
            startOfMonth.getDay()) /
            7
        );

        const monthData: ChartDataItem[] = [];
        for (let week = 1; week <= weeksInMonth; week++) {
          const weekStart = new Date(startOfMonth);
          weekStart.setDate(
            startOfMonth.getDate() + (week - 1) * 7 - startOfMonth.getDay()
          );
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 7);

          const count = orders.filter((order) => {
            const orderDate = new Date(order.createdAt);
            return (
              orderDate >= weekStart &&
              orderDate < weekEnd &&
              orderDate.getMonth() === now.getMonth()
            );
          }).length;

          monthData.push({ name: `W${week}`, orders: count });
        }

        setChartData(monthData);
      }
    } catch (error) {
      console.error("Failed to load chart data:", error);
      setChartData([]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <h1 className="text-xl md:text-2xl font-bold">Admin Dashboard</h1>
        <Button size="sm" onClick={() => navigate("/add-order")}>
          <Plus className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">New Order</span>
          <span className="sm:hidden">New</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-2 md:gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="p-2 md:p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-xs text-muted-foreground">
                Total Orders
              </p>
              <p className="text-lg md:text-xl font-bold">{stats.totalOrders}</p>
            </div>
            <Package className="h-6 w-6 md:h-8 md:w-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-2 md:p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-xs text-muted-foreground">
                Pending
              </p>
              <p className="text-lg md:text-xl font-bold text-orange-500">
                {stats.pendingOrders}
              </p>
            </div>
            <Clock className="h-6 w-6 md:h-8 md:w-8 text-orange-500" />
          </div>
        </Card>

        <Card className="p-2 md:p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-xs text-muted-foreground">
                Delivered
              </p>
              <p className="text-lg md:text-xl font-bold text-green-500">
                {stats.deliveredOrders}
              </p>
            </div>
            <CheckCircle className="h-6 w-6 md:h-8 md:w-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-2 md:p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-xs text-muted-foreground">
                Revenue
              </p>
              <p className="text-lg md:text-xl font-bold text-purple-500">
                ₹{stats.totalRevenue.toFixed(0)}
              </p>
            </div>
            <Package className="h-6 w-6 md:h-8 md:w-8 text-purple-500" />
          </div>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => navigate("/add-order")} className="text-xs md:text-sm">
          Create Order
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate("/orders")}
          className="text-xs md:text-sm"
        >
          View Orders
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={loadDashboard}
          className="text-xs md:text-sm"
        >
          <RefreshCw className="h-3 w-3 md:h-4 md:w-4 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Orders Chart */}
      <Card className="mt-4 md:mt-6">
        <CardHeader className="p-3 md:p-4 pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm md:text-lg">Orders Overview</CardTitle>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={chartView === "week" ? "default" : "outline"}
                onClick={() => setChartView("week")}
                className="h-6 md:h-7 px-2 md:px-3 text-[10px] md:text-xs"
              >
                Week
              </Button>
              <Button
                size="sm"
                variant={chartView === "month" ? "default" : "outline"}
                onClick={() => setChartView("month")}
                className="h-6 md:h-7 px-2 md:px-3 text-[10px] md:text-xs"
              >
                Month
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-2 md:p-4 pt-0">
          <div className="h-[200px] md:h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 5, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e5e7eb"
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#6b7280" }}
                  interval={0}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  allowDecimals={false}
                  width={35}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    fontSize: "12px",
                  }}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Bar
                  dataKey="orders"
                  fill="#6366f1"
                  radius={[4, 4, 0, 0]}
                  name="Orders"
                >
                  <LabelList
                    dataKey="orders"
                    position="inside"
                    fill="#fff"
                    fontSize={10}
                    fontWeight={600}
                    formatter={(value: number) => (value > 0 ? value : "")}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
