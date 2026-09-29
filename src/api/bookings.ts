import { api } from './client.js';
import type { ApiFieldSlot, ApiShowSeat, ApiEventBooking } from './types';

// ── Hôtel ───────────────────────────────────────────────────────────────────

export const hotelApi = {
  getRooms:         () => api.get('/api/bookings/hotel/rooms'),
  checkAvail:       (id: string, c: string, o: string) =>
    api.get(`/api/bookings/hotel/rooms/${id}/availability?check_in=${c}&check_out=${o}`),
  availBatch:       (check_in: string, check_out: string) =>
    api.get(`/api/bookings/hotel/availability-batch?check_in=${check_in}&check_out=${check_out}`),
  getMyBookings:    () => api.get('/api/bookings/hotel'),
  book: (data: {
    room_id: string; check_in: string; check_out: string;
    guests?: number; customer_name?: string; customer_phone?: string; customer_email?: string;
  }) => api.post('/api/bookings/hotel', data),
  cancel: (id: string) => api.patch(`/api/bookings/hotel/${id}/cancel`),
};

// ── Gym ─────────────────────────────────────────────────────────────────────

export const gymApi = {
  getPlans:           () => api.get('/api/bookings/gym/plans'),
  getCoaches:         () => api.get('/api/bookings/gym/coaches'),
  getMySubs:          () => api.get('/api/bookings/gym/subscriptions'),
  subscribe:          (data: { plan_id: string; customer_name?: string; customer_phone?: string; auto_renew?: boolean }) =>
    api.post('/api/bookings/gym/subscriptions', data),
  getMyCoachBookings: () => api.get('/api/bookings/gym/coach-bookings'),
  bookCoach:          (data: { coach_id: string; date: string; hours?: number; customer_name?: string; customer_phone?: string }) =>
    api.post('/api/bookings/gym/coach-bookings', data),
  cancelCoach:        (id: string) => api.patch(`/api/bookings/gym/coach-bookings/${id}/cancel`),
  checkin:            (sub_id?: string) => api.post('/api/bookings/gym/checkin', { sub_id }),
  getCheckins:        () => api.get('/api/bookings/gym/checkins'),
};

// ── Salon ────────────────────────────────────────────────────────────────────

export const salonApi = {
  getServices:      () => api.get('/api/bookings/salon/services'),
  getHairdressers:  () => api.get('/api/bookings/salon/hairdressers'),
  getAvailability:  (date: string, hairdresser_id?: string) =>
    api.get(`/api/bookings/salon/availability?date=${date}${hairdresser_id ? `&hairdresser_id=${hairdresser_id}` : ''}`),
  getWeekSlots:     (week_start: string, hairdresser_id?: string) =>
    api.get(`/api/bookings/salon/week-slots?week_start=${week_start}${hairdresser_id ? `&hairdresser_id=${hairdresser_id}` : ''}`),
  getMyBookings:    () => api.get('/api/bookings/salon'),
  book:             (data: {
    service_id: string; hairdresser_id?: string; date: string; slot: string;
    customer_name?: string; customer_phone?: string;
  }) => api.post('/api/bookings/salon', data),
  reschedule:       (id: string, new_date: string, new_slot: string) =>
    api.patch(`/api/bookings/salon/${id}/reschedule`, { new_date, new_slot }),
  rate:             (id: string, rating: number, comment?: string) =>
    api.patch(`/api/bookings/salon/${id}/rate`, { rating, comment }),
  cancel:           (id: string) => api.patch(`/api/bookings/salon/${id}/cancel`),
};

// ── Terrain ──────────────────────────────────────────────────────────────────

export const fieldApi = {
  getSlots:        () => api.get('/api/bookings/field/slots'),
  getAvailability: (date: string) => api.get<ApiFieldSlot[]>(`/api/bookings/field/availability?date=${date}`),
  getMyBookings:   () => api.get('/api/bookings/field'),
  book: (data: {
    date: string; slot: string; customer_name?: string; customer_phone?: string;
    recurrence?: string; recurrence_weeks?: number;
  }) => api.post('/api/bookings/field', data),
  cancel:          (id: string) => api.patch(`/api/bookings/field/${id}/cancel`),
};

// ── Événementiel ─────────────────────────────────────────────────────────────

export const eventApi = {
  getHalls:         () => api.get('/api/bookings/event/halls'),
  getOptions:       () => api.get('/api/bookings/event/options'),
  getMyBookings:    () => api.get<ApiEventBooking[]>('/api/bookings/event'),
  book:             (data: {
    hall_id: string; event_date: string; guests: number;
    options?: string[]; customer_name?: string; customer_phone?: string;
  }) => api.post<ApiEventBooking>('/api/bookings/event', data),
  sign:             (id: string, signature_data: string) =>
    api.patch(`/api/bookings/event/${id}/sign`, { signature_data }),
};

// ── Piscine ──────────────────────────────────────────────────────────────────

export const poolApi = {
  getPassTypes:      () => api.get('/api/bookings/pool/pass-types'),
  getMyPasses:       () => api.get('/api/bookings/pool/passes'),
  buyPass:           (data: { pass_type_id: string; customer_name?: string; customer_phone?: string }) =>
    api.post('/api/bookings/pool/passes', data),
  getPassQr:         (id: string) => api.get(`/api/bookings/pool/passes/${id}/qr`),
  useEntry:          (pass_id: string) => api.post('/api/bookings/pool/entry', { pass_id }),
  getCoursesCatalog: () => api.get('/api/bookings/pool/courses-catalog'),
  getCourseAvail:    (course_id: string, date: string, slot: string) =>
    api.get(`/api/bookings/pool/courses-catalog/${course_id}/availability?date=${date}&slot=${slot}`),
  getMyCourses:      () => api.get('/api/bookings/pool/courses'),
  bookCourse:        (data: {
    course_id: string; date: string; slot: string;
    customer_name?: string; customer_phone?: string;
  }) => api.post('/api/bookings/pool/courses', data),
  cancelCourse:      (id: string) => api.patch(`/api/bookings/pool/courses/${id}/cancel`),
};

// ── Cybercafé ────────────────────────────────────────────────────────────────

export const cybercafeApi = {
  getStations:    () => api.get('/api/bookings/cybercafe/stations'),
  getDurations:   () => api.get('/api/bookings/cybercafe/durations'),
  getServices:    () => api.get('/api/bookings/cybercafe/services'),
  getAvail:       (date: string) => api.get(`/api/bookings/cybercafe/availability?date=${date}`),
  getMySessions:  () => api.get('/api/bookings/cybercafe'),
  book:           (data: {
    station_id: string; duration_id: string; services?: string[];
    customer_name?: string; customer_phone?: string;
  }) => api.post('/api/bookings/cybercafe', data),
  complete:       (id: string) => api.patch(`/api/bookings/cybercafe/${id}/complete`),
  getWaitlist:    () => api.get('/api/bookings/cybercafe/waitlist'),
  joinWaitlist:   (station_id?: string) => api.post('/api/bookings/cybercafe/waitlist', { station_id }),
  leaveWaitlist:  (id: string) => api.delete(`/api/bookings/cybercafe/waitlist/${id}`),
};

// ── Restaurant (réservations de table) ───────────────────────────────────────

export const restaurantReservationApi = {
  getMyReservations: () => api.get('/api/bookings/restaurant'),
  make: (data: {
    customer_name: string; customer_phone: string; date: string; time: string;
    guests: number; notes?: string;
  }) => api.post('/api/bookings/restaurant', data),
  cancel: (id: string) => api.patch(`/api/bookings/restaurant/${id}/cancel`),
};

// ── Spectacles ───────────────────────────────────────────────────────────────

export const showApi = {
  getShows:     () => api.get('/api/bookings/show/shows'),
  getSeats:     (show_id: string) => api.get<ApiShowSeat[]>(`/api/bookings/show/shows/${show_id}/seats`),
  getMyTickets: () => api.get('/api/bookings/show'),
  getTicketQr:  (id: string) => api.get(`/api/bookings/show/${id}/qr`),
  book:         (data: {
    show_id: string;
    seats: { row: string; number: number; type: string; price: number }[];
    customer_name?: string; customer_phone?: string;
  }) => api.post('/api/bookings/show', data),
  cancel:       (id: string) => api.patch(`/api/bookings/show/${id}/cancel`),
};
