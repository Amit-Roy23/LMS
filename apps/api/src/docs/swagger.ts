export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Online Creative & IT Academy API',
    version: '1.0.0',
    description:
      'Production-grade RESTful API for Online Creative & IT Academy LMS with server-enforced progression state machines, video streaming, quizzes, assignments, exams, and verified certificates.',
  },
  servers: [
    {
      url: 'http://localhost:5000/api/v1',
      description: 'Local Development Server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'accessToken',
      },
    },
  },
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  paths: {
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user account',
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in with email and password',
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current authenticated user profile',
      },
    },
    '/courses': {
      get: {
        tags: ['Courses'],
        summary: 'List published courses with filters and pagination',
      },
    },
    '/courses/{slug}': {
      get: {
        tags: ['Courses'],
        summary: 'Get course details by slug with syllabus structure',
      },
    },
    '/courses/{id}/progression': {
      get: {
        tags: ['Progression'],
        summary: 'Get current student progression state for a course',
      },
    },
    '/enrollments/checkout': {
      post: {
        tags: ['Enrollment & Payments'],
        summary: 'Create payment checkout order for course enrollment',
      },
    },
    '/enrollments/verify': {
      post: {
        tags: ['Enrollment & Payments'],
        summary: 'Verify payment and activate enrollment',
      },
    },
    '/quizzes/{quizId}': {
      get: {
        tags: ['Quizzes'],
        summary: 'Get quiz questions for student runner',
      },
    },
    '/quizzes/{quizId}/attempt': {
      post: {
        tags: ['Quizzes'],
        summary: 'Submit quiz answers and evaluate score',
      },
    },
    '/assignments/{assignmentId}': {
      get: {
        tags: ['Assignments'],
        summary: 'Get assignment details and student submission history',
      },
    },
    '/assignments/{assignmentId}/submit': {
      post: {
        tags: ['Assignments'],
        summary: 'Submit practical assignment solution',
      },
    },
    '/certificates/verify/{certificateId}': {
      get: {
        tags: ['Certificates'],
        summary: 'Public verification of certificate legitimacy and metadata',
      },
    },
  },
};
