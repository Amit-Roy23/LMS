export var Role;
(function (Role) {
    Role["STUDENT"] = "STUDENT";
    Role["INSTRUCTOR"] = "INSTRUCTOR";
    Role["ADMIN"] = "ADMIN";
})(Role || (Role = {}));
export var UserStatus;
(function (UserStatus) {
    UserStatus["ACTIVE"] = "ACTIVE";
    UserStatus["SUSPENDED"] = "SUSPENDED";
    UserStatus["INACTIVE"] = "INACTIVE";
})(UserStatus || (UserStatus = {}));
export var DeliveryMode;
(function (DeliveryMode) {
    DeliveryMode["RECORDED"] = "RECORDED";
    DeliveryMode["LIVE"] = "LIVE";
})(DeliveryMode || (DeliveryMode = {}));
export var BatchStatus;
(function (BatchStatus) {
    BatchStatus["UPCOMING"] = "UPCOMING";
    BatchStatus["RUNNING"] = "RUNNING";
    BatchStatus["COMPLETED"] = "COMPLETED";
    BatchStatus["CANCELLED"] = "CANCELLED";
})(BatchStatus || (BatchStatus = {}));
export var CourseStatus;
(function (CourseStatus) {
    CourseStatus["DRAFT"] = "DRAFT";
    CourseStatus["PUBLISHED"] = "PUBLISHED";
    CourseStatus["ARCHIVED"] = "ARCHIVED";
})(CourseStatus || (CourseStatus = {}));
export var CourseLevel;
(function (CourseLevel) {
    CourseLevel["BEGINNER"] = "BEGINNER";
    CourseLevel["INTERMEDIATE"] = "INTERMEDIATE";
    CourseLevel["ADVANCED"] = "ADVANCED";
    CourseLevel["ALL_LEVELS"] = "ALL_LEVELS";
})(CourseLevel || (CourseLevel = {}));
export var ModuleStatus;
(function (ModuleStatus) {
    ModuleStatus["LOCKED"] = "LOCKED";
    ModuleStatus["AVAILABLE"] = "AVAILABLE";
    ModuleStatus["IN_PROGRESS"] = "IN_PROGRESS";
    ModuleStatus["AWAITING_REVIEW"] = "AWAITING_REVIEW";
    ModuleStatus["COMPLETED"] = "COMPLETED";
})(ModuleStatus || (ModuleStatus = {}));
export var QuestionType;
(function (QuestionType) {
    QuestionType["SINGLE_CHOICE"] = "SINGLE_CHOICE";
    QuestionType["MULTIPLE_CHOICE"] = "MULTIPLE_CHOICE";
})(QuestionType || (QuestionType = {}));
export var SubmissionStatus;
(function (SubmissionStatus) {
    SubmissionStatus["PENDING"] = "PENDING";
    SubmissionStatus["CHANGES_REQUESTED"] = "CHANGES_REQUESTED";
    SubmissionStatus["APPROVED"] = "APPROVED";
    SubmissionStatus["REJECTED"] = "REJECTED";
})(SubmissionStatus || (SubmissionStatus = {}));
export var EnrollmentStatus;
(function (EnrollmentStatus) {
    EnrollmentStatus["ACTIVE"] = "ACTIVE";
    EnrollmentStatus["COMPLETED"] = "COMPLETED";
    EnrollmentStatus["CANCELLED"] = "CANCELLED";
    EnrollmentStatus["EXPIRED"] = "EXPIRED";
})(EnrollmentStatus || (EnrollmentStatus = {}));
export var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "PENDING";
    PaymentStatus["PAID"] = "PAID";
    PaymentStatus["COMPLETED"] = "COMPLETED";
    PaymentStatus["PARTIAL"] = "PARTIAL";
    PaymentStatus["FAILED"] = "FAILED";
    PaymentStatus["REFUNDED"] = "REFUNDED";
})(PaymentStatus || (PaymentStatus = {}));
export var AccessStatus;
(function (AccessStatus) {
    AccessStatus["ACTIVE"] = "ACTIVE";
    AccessStatus["SUSPENDED"] = "SUSPENDED";
    AccessStatus["EXPIRED"] = "EXPIRED";
})(AccessStatus || (AccessStatus = {}));
export var PaymentProvider;
(function (PaymentProvider) {
    PaymentProvider["MOCK"] = "MOCK";
    PaymentProvider["RAZORPAY"] = "RAZORPAY";
    PaymentProvider["UPI"] = "UPI";
    PaymentProvider["MANUAL"] = "MANUAL";
})(PaymentProvider || (PaymentProvider = {}));
export var LiveProvider;
(function (LiveProvider) {
    LiveProvider["ZOOM"] = "ZOOM";
    LiveProvider["MEET"] = "MEET";
    LiveProvider["YOUTUBE"] = "YOUTUBE";
    LiveProvider["OTHER"] = "OTHER";
})(LiveProvider || (LiveProvider = {}));
export var LiveSessionStatus;
(function (LiveSessionStatus) {
    LiveSessionStatus["SCHEDULED"] = "SCHEDULED";
    LiveSessionStatus["LIVE"] = "LIVE";
    LiveSessionStatus["COMPLETED"] = "COMPLETED";
    LiveSessionStatus["CANCELLED"] = "CANCELLED";
})(LiveSessionStatus || (LiveSessionStatus = {}));
export var AttendanceStatus;
(function (AttendanceStatus) {
    AttendanceStatus["PRESENT"] = "PRESENT";
    AttendanceStatus["ABSENT"] = "ABSENT";
    AttendanceStatus["LATE"] = "LATE";
    AttendanceStatus["EXCUSED"] = "EXCUSED";
})(AttendanceStatus || (AttendanceStatus = {}));
export var InquiryStatus;
(function (InquiryStatus) {
    InquiryStatus["NEW"] = "NEW";
    InquiryStatus["CONTACTED"] = "CONTACTED";
    InquiryStatus["CONVERTED"] = "CONVERTED";
    InquiryStatus["CLOSED"] = "CLOSED";
})(InquiryStatus || (InquiryStatus = {}));
export var RegistrationStatus;
(function (RegistrationStatus) {
    RegistrationStatus["DRAFT"] = "DRAFT";
    RegistrationStatus["PENDING_PAYMENT"] = "PENDING_PAYMENT";
    RegistrationStatus["PAID"] = "PAID";
    RegistrationStatus["ACCOUNT_CREATED"] = "ACCOUNT_CREATED";
    RegistrationStatus["CANCELLED"] = "CANCELLED";
})(RegistrationStatus || (RegistrationStatus = {}));
export var PerformanceLevel;
(function (PerformanceLevel) {
    PerformanceLevel["EXCELLENT"] = "EXCELLENT";
    PerformanceLevel["GOOD"] = "GOOD";
    PerformanceLevel["AVERAGE"] = "AVERAGE";
    PerformanceLevel["NEEDS_ATTENTION"] = "NEEDS_ATTENTION";
})(PerformanceLevel || (PerformanceLevel = {}));
export var CertificateStatus;
(function (CertificateStatus) {
    CertificateStatus["VALID"] = "VALID";
    CertificateStatus["REVOKED"] = "REVOKED";
})(CertificateStatus || (CertificateStatus = {}));
export var NotificationChannel;
(function (NotificationChannel) {
    NotificationChannel["EMAIL"] = "EMAIL";
    NotificationChannel["WHATSAPP"] = "WHATSAPP";
    NotificationChannel["SMS"] = "SMS";
})(NotificationChannel || (NotificationChannel = {}));
export var NotificationStatus;
(function (NotificationStatus) {
    NotificationStatus["QUEUED"] = "QUEUED";
    NotificationStatus["SENT"] = "SENT";
    NotificationStatus["FAILED"] = "FAILED";
})(NotificationStatus || (NotificationStatus = {}));
export var NotificationType;
(function (NotificationType) {
    NotificationType["SYSTEM"] = "SYSTEM";
    NotificationType["ENROLLMENT"] = "ENROLLMENT";
    NotificationType["REVIEW_FEEDBACK"] = "REVIEW_FEEDBACK";
    NotificationType["CERTIFICATE_ISSUED"] = "CERTIFICATE_ISSUED";
    NotificationType["QUIZ_RESULT"] = "QUIZ_RESULT";
    NotificationType["LIVE_CLASS_REMINDER"] = "LIVE_CLASS_REMINDER";
})(NotificationType || (NotificationType = {}));
