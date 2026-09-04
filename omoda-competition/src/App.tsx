import { Routes, Route } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ProtectedRoute, AdminRoute } from "@/components/RouteGuards";

import Home from "@/pages/Home";
import CompetitionPage from "@/pages/Competition";
import EnterNow from "@/pages/EnterNow";
import PaymentResult from "@/pages/PaymentResult";
import MyAccount from "@/pages/MyAccount";
import WinnerPage from "@/pages/Winner";
import Faq from "@/pages/Faq";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";
import Contact from "@/pages/Contact";
import Login from "@/pages/Login";

import AdminLayout from "@/pages/admin/AdminLayout";
import Overview from "@/pages/admin/Overview";
import AdminCompetitions from "@/pages/admin/Competitions";
import AdminEntries from "@/pages/admin/Entries";
import AdminPayments from "@/pages/admin/Payments";
import AdminUsers from "@/pages/admin/Users";
import AdminFaqs from "@/pages/admin/Faqs";
import AdminWinners from "@/pages/admin/Winners";
import AdminAuditLog from "@/pages/admin/AuditLog";

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/competition" element={<CompetitionPage />} />
          <Route path="/winner" element={<WinnerPage />} />
          <Route path="/faq" element={<Faq />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />

          <Route path="/enter" element={<EnterNow />} />
          <Route path="/payment-result" element={<PaymentResult />} />

          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <MyAccount />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<Overview />} />
            <Route path="competitions" element={<AdminCompetitions />} />
            <Route path="entries" element={<AdminEntries />} />
            <Route path="payments" element={<AdminPayments />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="faqs" element={<AdminFaqs />} />
            <Route path="winners" element={<AdminWinners />} />
            <Route path="audit-log" element={<AdminAuditLog />} />
          </Route>
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
