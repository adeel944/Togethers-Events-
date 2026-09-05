export type EventType =
  | 'Mehndi' | 'Baraat' | 'Walima' | 'Nikkah' | 'Birthday' | 'Corporate' | 'Other';
export type BookingStatus = 'Inquiry' | 'Confirmed' | 'Completed' | 'Cancelled';
export type PaymentStatus = 'Pending' | 'Partial' | 'Paid';
export type VendorCategory = 'Decorator' | 'Caterer' | 'Photographer' | 'Videographer' | 'Makeup Artist' | 'Mehndi Artist' | 'DJ / Sound' | 'Florist' | 'Venue' | 'Furniture' | 'Lighting' | 'Transport' | 'Other';
export interface Client { id:string; fullName:string; phone:string; whatsApp:string; email:string; billingAddress:string; city:string; country:string; notes?:string; createdAt:string; }
export interface Vendor { id:string; vendorName:string; category:VendorCategory; contactPerson:string; phone:string; whatsApp:string; email:string; address:string; services:string; paymentTerms:string; notes?:string; createdAt:string; }
export interface BookingVendor { id:string; vendorId:string; vendorName:string; category:VendorCategory; agreedAmount:number; paymentStatus:PaymentStatus; paidAmount?:number; paymentDate?:string; paymentMethod?:string; paymentNotes?:string; notes?:string; }
export interface Booking { id:string; clientId:string; clientName:string; eventType:EventType; eventDate:string; eventTime:string; venue:string; guestCount:number; package:string; totalAmount:number; advancePaid:number; remainingAmount:number; bookingStatus:BookingStatus; paymentStatus:PaymentStatus; notes?:string; assignedVendors:BookingVendor[]; createdAt:string; }
export interface InvoiceItem { id:string; description:string; quantity:number; unitPrice:number; total:number; }
export interface MenuItem { id:string; name:string; description?:string; price?:number; createdAt:string; }
export interface Invoice { id:string; invoiceNumber:string; documentTitle?:string; bookingId?:string; clientId:string; clientName:string; clientPhone:string; clientWhatsApp:string; clientEmail:string; billingAddress:string; eventType:EventType; eventDate:string; eventTime?:string; venue:string; guestCount?:number; issueDate:string; dueDate?:string; items:InvoiceItem[]; subtotal:number; discount:number; tax:number; totalAmount:number; advancePaid:number; remainingBalance:number; paymentStatus:PaymentStatus; notes?:string; termsAndConditions:string; templateId:string; createdAt:string; }
export interface BusinessProfile { businessName:string; tagline:string; ownerName:string; phone:string; whatsApp:string; email:string; website:string; address:string; city:string; country:string; taxNumber?:string; registrationNumber?:string; logoUrl?:string; signatureUrl?:string; invoiceFooterText:string; defaultTerms:string; defaultCurrency:string; currency?:string; currencySymbol:string; invoicePrefix:string; invoiceStartingNumber:number; bankDetails?:{bankName:string;accountTitle:string;accountNumber:string;iban?:string}; }
export type TextScale = 'small'|'medium'|'large';
export interface InvoiceSettings {
  documentTitle:string;
  defaultTemplate:string;
  showLogo:boolean;
  showSignature:boolean;
  showBusinessAddress:boolean;
  showBillingAddress?:boolean;
  showContactInfo?:boolean;
  showPhone:boolean;
  showEmail:boolean;
  fontSize:TextScale;
  bodySize:TextScale;
  headingSize:TextScale;
  dateFormat:'YYYY-MM-DD'|'DD/MM/YYYY'|'MM/DD/YYYY'|'MMM DD, YYYY';
  whatsappMessageTemplate?:string;
  emailMessageTemplate?:string;
}
export interface BusinessExpense { id:string; title:string; category:'Operations'|'Transport'|'Staff'|'Marketing'|'Office'|'Other'; amount:number; date:string; notes?:string; createdAt:string; }
export type NavTab = 'dashboard'|'bookings'|'calendar'|'clients'|'vendors'|'menus'|'invoices'|'finance'|'settings-profile'|'settings-invoice'|'invoice-preview';