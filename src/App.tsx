import React, { useState } from 'react';
import { HotelProvider, useHotel } from './context/HotelContext';
import { Header } from './components/Header';
import { Sidebar, NavScreen } from './components/Sidebar';
import { LoginScreen } from './components/LoginScreen';
import { Icon } from './components/ui';

// Views
import { DashboardView } from './views/DashboardView';
import { ReservationsView } from './views/ReservationsView';
import { TapeChartView } from './views/TapeChartView';
import { RoomTypesView } from './views/RoomTypesView';
import { RoomMatrixView } from './views/RoomMatrixView';
import { StaffView } from './views/StaffView';
import { EmployeesSection } from './views/EmployeeDetailPage';
import { LeaveRequestsView } from './views/LeaveRequestsView';
import { EnquiriesView } from './views/EnquiriesView';
import { EventsContentView } from './views/EventsContentView';
import { GoldenTicketsView } from './views/GoldenTicketsView';
import { ContactsView } from './views/ContactsView';
import { NewsletterSubscribersView } from './views/NewsletterSubscribersView';
import { SmsTemplatesView } from './views/SmsTemplatesView';
import { SmsCampaignsView } from './views/SmsCampaignsView';
import { SmsDeliveriesView } from './views/SmsDeliveriesView';

// Modals
import { NewReservationModal } from './components/modals/NewReservationModal';
import { RoomActionDrawer } from './components/modals/RoomActionDrawer';
import { CheckInModal } from './components/modals/CheckInModal';
import { AssignCleaningModal } from './components/modals/AssignCleaningModal';
import { FolioModal } from './components/modals/FolioModal';
import { ActivityDrawer } from './components/modals/ActivityDrawer';
import { SearchModal } from './components/modals/SearchModal';

const MainLayout: React.FC = () => {
  const { currentUser, authReady, hasPermission } = useHotel();
  const [selectedScreen, setScreen] = useState<NavScreen>('dashboard');
  // Content editors can't see operations — send them to the one screen they can use.
  const screen: NavScreen =
    hasPermission('canViewOperations') ||
    selectedScreen === 'enquiries' ||
    selectedScreen === 'events-content' ||
    selectedScreen === 'golden-tickets' ||
    selectedScreen === 'contacts' ||
    selectedScreen === 'newsletter-subscribers' ||
    selectedScreen === 'sms-templates' ||
    selectedScreen === 'sms-campaigns' ||
    selectedScreen === 'sms-deliveries' ||
    (selectedScreen === 'leave' && hasPermission('canViewStaff'))
      ? selectedScreen
      : 'enquiries';

  const [isNewReservationOpen, setIsNewReservationOpen] = useState(false);
  const [checkInBookingId, setCheckInBookingId] = useState<string | null | undefined>(undefined);
  const [isAssignCleaningOpen, setIsAssignCleaningOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [folioBookingId, setFolioBookingId] = useState<string | null>(null);

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#f4efe6] flex items-center justify-center">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#786f62]">
          <Icon name="progress_activity" className="text-[22px] animate-spin text-[#d99d26]" />
          <span>Restoring secure session…</span>
        </div>
      </div>
    );
  }

  if (!currentUser) return <LoginScreen />;

  const actions = {
    onOpenNewReservation: () => setIsNewReservationOpen(true),
    onOpenCheckIn: (bookingId?: string) => setCheckInBookingId(bookingId ?? null),
    onOpenAssignCleaning: () => setIsAssignCleaningOpen(true),
    onSelectRoom: (roomId: string) => setSelectedRoomId(roomId),
    onOpenFolio: (bookingId: string) => setFolioBookingId(bookingId),
  };

  return (
    <div className="min-h-screen bg-[#f4efe6] text-[#161410] flex">
      <Sidebar currentScreen={screen} onNavigate={setScreen} onOpenNewReservation={actions.onOpenNewReservation} />

      <div className="pl-64 flex-1 flex flex-col min-w-0">
        <Header
          onOpenNewReservation={actions.onOpenNewReservation}
          onOpenCheckIn={() => actions.onOpenCheckIn()}
          onOpenAssignCleaning={actions.onOpenAssignCleaning}
          onOpenActivity={() => setIsActivityOpen(true)}
          onOpenSearch={() => setIsSearchOpen(true)}
        />

        <main className="w-full pt-16 bg-[#f4efe6] min-h-screen">
          {screen === 'dashboard' && <DashboardView {...actions} onNavigate={setScreen} />}
          {screen === 'reservations' && <ReservationsView key="all" mode="all" {...actions} />}
          {screen === 'arrivals' && <ReservationsView key="arrivals" mode="arrivals" {...actions} />}
          {screen === 'tape-chart' && <TapeChartView {...actions} />}
          {screen === 'rooms' && <RoomMatrixView key="rooms" mode="all" {...actions} />}
          {screen === 'housekeeping' && <RoomMatrixView key="hk" mode="housekeeping" {...actions} />}
          {screen === 'maintenance' && <RoomMatrixView key="oos" mode="maintenance" {...actions} />}
          {screen === 'rates' && <RoomTypesView />}
          {screen === 'enquiries' && <EnquiriesView />}
          {screen === 'events-content' && <EventsContentView />}
          {screen === 'contacts' && <ContactsView />}
          {screen === 'newsletter-subscribers' && <NewsletterSubscribersView />}
          {screen === 'sms-templates' && <SmsTemplatesView />}
          {screen === 'sms-campaigns' && <SmsCampaignsView />}
          {screen === 'sms-deliveries' && <SmsDeliveriesView />}
          {screen === 'golden-tickets' && <GoldenTicketsView />}
          {screen === 'staff' && <StaffView />}
          {screen === 'employees' && <EmployeesSection />}
          {screen === 'leave' && <LeaveRequestsView />}
        </main>
      </div>

      {isNewReservationOpen && (
        <NewReservationModal
          onClose={() => setIsNewReservationOpen(false)}
          onCreated={(bookingId) => {
            setIsNewReservationOpen(false);
            setFolioBookingId(bookingId);
          }}
        />
      )}
      {checkInBookingId !== undefined && (
        <CheckInModal bookingId={checkInBookingId} onClose={() => setCheckInBookingId(undefined)} />
      )}
      {isAssignCleaningOpen && <AssignCleaningModal onClose={() => setIsAssignCleaningOpen(false)} />}
      {isActivityOpen && (
        <ActivityDrawer
          onClose={() => setIsActivityOpen(false)}
          onOpenBooking={(bookingId) => {
            setIsActivityOpen(false);
            setFolioBookingId(bookingId);
          }}
        />
      )}
      {isSearchOpen && (
        <SearchModal
          onClose={() => setIsSearchOpen(false)}
          onSelectRoom={actions.onSelectRoom}
          onSelectBooking={actions.onOpenFolio}
          onOpenNewReservation={actions.onOpenNewReservation}
        />
      )}
      {selectedRoomId && (
        <RoomActionDrawer
          roomId={selectedRoomId}
          onClose={() => setSelectedRoomId(null)}
          onOpenFolio={actions.onOpenFolio}
        />
      )}
      {folioBookingId && (
        <FolioModal
          bookingId={folioBookingId}
          onClose={() => setFolioBookingId(null)}
          onCheckIn={(bookingId) => {
            setFolioBookingId(null);
            setCheckInBookingId(bookingId);
          }}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <HotelProvider>
      <MainLayout />
    </HotelProvider>
  );
}
