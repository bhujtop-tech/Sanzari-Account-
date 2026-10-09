import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import { Header } from './components/common/Header';
import { BottomNav } from './components/common/BottomNav';
import { StickyMobileQuickActions } from './components/common/StickyMobileQuickActions';
import { Sidebar } from './components/common/Sidebar';
import { AuthScreen } from './components/auth/AuthScreen';

// Core Dryfruit Views
import { HomeDashboard } from './components/home/HomeDashboard';
import { SalesList } from './components/sales/SalesList';
import { StockView } from './components/stock/StockView';
import { AccountsView } from './components/accounts/AccountsView';

// Core Tourism Views
import { TourismDashboard } from './components/tourism/TourismDashboard';
import { TourBatchesView } from './components/tourism/TourBatchesView';
import { TourBookingsView } from './components/tourism/TourBookingsView';
import { TourPassengersView } from './components/tourism/TourPassengersView';
import { TourReportsView } from './components/tourism/TourReportsView';

// More Sections
import { CustomersView } from './components/customers/CustomersView';
import { ProductsView } from './components/products/ProductsView';
import { ExpensesList } from './components/expenses/ExpensesList';
import { PurchasesView } from './components/purchases/PurchasesView';
import { VendorsView } from './components/purchases/VendorsView';
import { UsersView } from './components/users/UsersView';
import { MonthlyView } from './components/monthly/MonthlyView';
import { ReportsView } from './components/reports/ReportsView';
import { SettingsView } from './components/settings/SettingsView';

// Global Modals
import { AddSaleModal } from './components/sales/AddSaleModal';
import { AddExpenseModal } from './components/expenses/AddExpenseModal';
import { AddPaymentModal } from './components/payments/AddPaymentModal';
import { TransferModal } from './components/accounts/TransferModal';
import { AiAssistantModal } from './components/ai/AiAssistantModal';

// Tourism Modals
import { AddTourBookingModal } from './components/tourism/AddTourBookingModal';
import { AddTourBatchModal } from './components/tourism/AddTourBatchModal';
import { AddTourExpenseModal } from './components/tourism/AddTourExpenseModal';
import { TourReceiptModal } from './components/tourism/TourReceiptModal';
import { TourBatchDetailModal } from './components/tourism/TourBatchDetailModal';

import { PublicStorePortal } from './components/public/PublicStorePortal';
import { GoogleSheetsSyncModal } from './components/sheets/GoogleSheetsSyncModal';
import { PdfCustomizerModal } from './components/pdf/PdfCustomizerModal';
import { TransactionDetailModal } from './components/common/TransactionDetailModal';
import { AllActivityModal } from './components/common/AllActivityModal';

const MainAppContent: React.FC = () => {
  const { user, isUnlocked, loading: authLoading } = useAuth();
  const {
    businessMode,
    activeTab,
    setActiveTab,
    activeMoreSection,
    isGoogleSheetsOpen,
    setIsGoogleSheetsOpen,
    isPdfCustomizerOpen,
    setIsPdfCustomizerOpen,
    isAddTourBookingOpen,
    setIsAddTourBookingOpen,
    isAddTourBatchOpen,
    setIsAddTourBatchOpen,
    isAddTourExpenseOpen,
    setIsAddTourExpenseOpen,
    isTourReceiptOpen,
    setIsTourReceiptOpen,
    tourReceiptBooking,
    selectedTourBatchId,
    setSelectedTourBatchId,
  } = useData();

  const [selectedBatchForBooking, setSelectedBatchForBooking] = useState<string>('');

  // Check if public share URL is being accessed
  const searchParams = new URLSearchParams(window.location.search);
  const isPublicView = searchParams.get('view') === 'public' || searchParams.get('public') === 'true';

  if (isPublicView) {
    return (
      <PublicStorePortal
        onGoToLogin={() => {
          window.history.replaceState({}, '', window.location.pathname);
          window.location.reload();
        }}
      />
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-zinc-950 text-white flex items-center justify-center font-black text-xl mb-3 animate-pulse">
          SZ
        </div>
        <p className="text-xs font-semibold text-zinc-500">Loading Sanzari Accounts...</p>
      </div>
    );
  }

  if (!user || !isUnlocked) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col md:flex-row text-zinc-900">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header with Business Mode Switcher */}
        <Header />

        {/* View Router (Dynamically routed for Dry Fruits vs Tourism mode) */}
        <main className="flex-1 px-3 sm:px-8 pt-4 sm:pt-5 pb-48 md:pb-12 overflow-y-auto">
          {businessMode === 'tourism' ? (
            /* TOURISM VIEWS */
            <>
              {activeTab === 'home' && (
                <TourismDashboard
                  onNavigateTab={setActiveTab}
                  onSelectBatch={(id) => setSelectedTourBatchId(id)}
                />
              )}
              {activeTab === 'sales' && <TourBookingsView />}
              {activeTab === 'stock' && (
                <TourBatchesView
                  onSelectBatch={(id) => setSelectedTourBatchId(id)}
                  onBookTour={(id) => {
                    setSelectedBatchForBooking(id);
                    setIsAddTourBookingOpen(true);
                  }}
                />
              )}
              {activeTab === 'accounts' && <AccountsView />}

              {activeTab === 'more' && (
                <>
                  {activeMoreSection === 'customers' && <TourPassengersView />}
                  {activeMoreSection === 'reports' && <TourReportsView />}
                  {activeMoreSection === 'expenses' && <ExpensesList />}
                  {activeMoreSection === 'users' && <UsersView />}
                  {activeMoreSection === 'monthly' && <MonthlyView />}
                  {activeMoreSection === 'settings' && <SettingsView />}
                  {activeMoreSection === 'products' && (
                    <TourBatchesView
                      onSelectBatch={(id) => setSelectedTourBatchId(id)}
                      onBookTour={(id) => {
                        setSelectedBatchForBooking(id);
                        setIsAddTourBookingOpen(true);
                      }}
                    />
                  )}
                  {activeMoreSection === 'vendors' && <VendorsView />}
                  {activeMoreSection === 'purchases' && <PurchasesView />}
                </>
              )}
            </>
          ) : (
            /* DRY FRUIT STORE VIEWS */
            <>
              {activeTab === 'home' && <HomeDashboard />}
              {activeTab === 'sales' && <SalesList />}
              {activeTab === 'stock' && <StockView />}
              {activeTab === 'accounts' && <AccountsView />}

              {activeTab === 'more' && (
                <>
                  {activeMoreSection === 'customers' && <CustomersView />}
                  {activeMoreSection === 'products' && <ProductsView />}
                  {activeMoreSection === 'expenses' && <ExpensesList />}
                  {activeMoreSection === 'purchases' && <PurchasesView />}
                  {activeMoreSection === 'vendors' && <VendorsView />}
                  {activeMoreSection === 'users' && <UsersView />}
                  {activeMoreSection === 'monthly' && <MonthlyView />}
                  {activeMoreSection === 'reports' && <ReportsView />}
                  {activeMoreSection === 'settings' && <SettingsView />}
                </>
              )}
            </>
          )}
        </main>

        {/* Mobile Sticky Action Bar */}
        <StickyMobileQuickActions />

        {/* Mobile Bottom Navigation */}
        <BottomNav />
      </div>

      {/* Global Transaction History Modals */}
      <TransactionDetailModal />
      <AllActivityModal />

      {/* Dryfruit Modals */}
      <AddSaleModal />
      <AddExpenseModal />
      <AddPaymentModal />
      <TransferModal />
      <AiAssistantModal />
      <GoogleSheetsSyncModal isOpen={isGoogleSheetsOpen} onClose={() => setIsGoogleSheetsOpen(false)} />
      <PdfCustomizerModal isOpen={isPdfCustomizerOpen} onClose={() => setIsPdfCustomizerOpen(false)} />

      {/* Tourism Modals */}
      <AddTourBookingModal
        isOpen={isAddTourBookingOpen}
        onClose={() => {
          setIsAddTourBookingOpen(false);
          setSelectedBatchForBooking('');
        }}
        preselectedBatchId={selectedBatchForBooking}
      />
      <AddTourBatchModal
        isOpen={isAddTourBatchOpen}
        onClose={() => setIsAddTourBatchOpen(false)}
      />
      <AddTourExpenseModal
        isOpen={isAddTourExpenseOpen}
        onClose={() => setIsAddTourExpenseOpen(false)}
      />
      <TourReceiptModal
        isOpen={isTourReceiptOpen}
        onClose={() => setIsTourReceiptOpen(false)}
        booking={tourReceiptBooking}
      />
      <TourBatchDetailModal
        isOpen={!!selectedTourBatchId}
        onClose={() => setSelectedTourBatchId(null)}
        batchId={selectedTourBatchId}
        onAddBookingToBatch={(batchId) => {
          setSelectedTourBatchId(null);
          setSelectedBatchForBooking(batchId);
          setIsAddTourBookingOpen(true);
        }}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <MainAppContent />
      </DataProvider>
    </AuthProvider>
  );
}
