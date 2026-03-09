import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import "../../styles/login.css";
import { socket } from "../../socket";
import SplashScreen from "../../components/SplashScreen";
import { getUlrLogo } from "../../api/logoApi";
const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(
    null
  );
  const navigate = useNavigate();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  // Helper function to convert logo URL to full URL
  const getFullLogoUrl = (url: string | null): string => {
    if (!url) return "/icons/codegymlogo.png";

    if (url.startsWith("http")) return url;

    const baseUrl = process.env.REACT_APP_SOCKET_URL
      ? process.env.REACT_APP_SOCKET_URL.replace("/api", "")
      : "http://localhost:3005";

    if (url.startsWith("/api/uploads")) {
      return `${baseUrl}${url}`;
    } else if (url.startsWith("/uploads")) {
      return `${baseUrl}/api${url}`;
    } else {
      const cleanPath = url.startsWith("/") ? url : `/${url}`;
      return `${baseUrl}/api/uploads${cleanPath}`;
    }
  };

  // Load email đã lưu khi component mount
  useEffect(() => {
    const savedEmail = localStorage.getItem("remember_email");
    if (savedEmail) {
      setEmail(savedEmail);
      setRemember(true);
    }
  }, []);
  useEffect(() => {
    const loadLogo = async () => {
      try {
        const res = await getUlrLogo();
        // Giả sử API trả về mảng như bạn gửi
        if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
          setLogoUrl(res.data[0].url); // lấy logo đầu tiên
        }
      } catch (error) {
        console.error("Lỗi khi lấy logo:", error);
      }
    };
    loadLogo();
  }, []);

  // Xử lý đăng nhập Local

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = { login: email, password };
      const res = await axios.post(
        `${process.env.REACT_APP_SOCKET_URL}/login`,
        payload
      );
      const { success, data, message } = res.data;

      if (success && data?.token && data?.user && data?.refreshToken) {
        const { token, user, refreshToken } = data;

        // Lưu thông tin cơ bản
        localStorage.setItem("token", token);
        localStorage.setItem("email", user.email || "");
        localStorage.setItem("userId", user.id || "");
        localStorage.setItem("Type_login", "Local");
        localStorage.setItem("refreshToken", refreshToken);
        // Chuẩn hóa roles
        let roles: string[] = [];
        if (user.role) roles.push(user.role);
        if (Array.isArray(user.roles)) roles = [...roles, ...user.roles];
        if (roles.length === 0) roles.push("user"); // fallback
        localStorage.setItem("roles", JSON.stringify(roles));

        socket.emit("register", user.id);

        // Lưu/huỷ email nhớ
        if (remember) localStorage.setItem("remember_email", email);
        else localStorage.removeItem("remember_email");

        toast.success(
          <div>
            <div className="font-semibold mb-1">Login successful!</div>
            <div className="text-sm text-gray-500">
              Welcome back to the system.
            </div>
          </div>
        );

        // Redirect theo role (giống AnimatedRoutes)
        const allowedAdminRoles = ["admin", "System_Manager"];
        const isAdmin = roles.some((role) => allowedAdminRoles.includes(role));

        // Hiển thị splash screen trước khi navigate
        const targetPath = isAdmin ? "/admin" : "/dashboard";
        setPendingNavigation(targetPath);
        setShowSplash(true);
      } else {
        toast.error(`Login failed  ${message || ""}`);
      }
    } catch (error: any) {
      // Axios Network Error hoặc 503 từ backend
      if (error.response) {
        // Backend trả lỗi có response
        if (error.response.status === 503) {
          console.log("Website đang bảo trì");
          window.location.href = "/maintenance.html"; // public/maintenance.html
          return;
        }
      } else if (error.message === "Network Error") {
        // Trường hợp backend không reachable (có thể đang bảo trì)
        console.log("Network error - có thể website đang bảo trì");
        window.location.href = "/maintenance.html";
        return;
      }

      // Các lỗi khác vẫn thông báo bình thường
      toast.error(
        `Login failed ${error.response?.data?.message || error.message || ""}`
      );
    } finally {
      setLoading(false);
    }
  };

  // Xử lý logout
  const handleLogout = () => {
    localStorage.clear();
    toast.success(
      <div>
        <div className="font-semibold mb-1">Logout successful!</div>
        <div className="text-sm text-gray-500">
          You have logged out of the system.
        </div>
      </div>
    );
    navigate("/login");
  };

  // Kiểm tra trạng thái token để hiển thị nút logout nếu đã đăng nhập
  const token = localStorage.getItem("token");

  // Xử lý khi splash screen hoàn thành
  const handleSplashComplete = () => {
    if (pendingNavigation) {
      navigate(pendingNavigation, { replace: true });
    }
  };

  // Hiển thị splash screen nếu đang trong quá trình chuyển trang
  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  return (
    <div className="login-page">
      <div className="wrapper">
        {/* Cột trái: Form đăng nhập */}
        <div className="login-left">
          <div className="flex justify-center items-center mb-4">
            <img
              src={getFullLogoUrl(logoUrl)}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  "/icons/codegymlogo.png";
              }}
              alt="Logo"
              className="login-logo mx-auto"
            />
          </div>

          <h4 className="text-center mb-4 fgg">Login</h4>
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <input
                type="text"
                className="form-control nput1"
                placeholder="Username or Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="mb-3">
              <input
                type="password"
                className="form-control nput2"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-check mb-3">
              <input
                className="form-check-input"
                type="checkbox"
                id="remember"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="remember">
                Remember account
              </label>
            </div>

            <div className="sd">
              <button type="submit" className="dangnhapbtn" disabled={loading}>
                {loading ? "Logging in..." : "Login"}
              </button>
            </div>

            {/* Hiển thị nút logout nếu đã đăng nhập */}
            {token && (
              <div className="text-center mt-3">
                <button
                  type="button"
                  className="dangnhapbtn"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Cột phải: Ảnh nền */}
        <div className="login-right">
          <img
            src="https://blog.spacematrix.com/sites/default/files/styles/resp_large_breakpoints_theme_archi_dark_wide_1x/public/pantone_linkedin_cover.jpg"
            alt="Background"
            className="login-bg-img"
          />
        </div>
      </div>
    </div>
  );
};

export default Login;
