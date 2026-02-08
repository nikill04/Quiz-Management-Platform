// swagger.js
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Quiz App API',
      version: '1.0.0',
      description: 'API documentation for the Quiz App (Auth, Student, Teacher)',
    },
    servers: [
      {
        url:
          process.env.NODE_ENV === 'development'
            ? 'http://localhost:5000/api'
            : 'https://quizapp-backend-frj2.onrender.com/api',
      }, // Change for production
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    
  },
  apis: [path.join(__dirname, '../routes/*.js')], // Path to your route files with Swagger annotations
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

export { swaggerUi, swaggerSpec };


// // swagger.js
// import swaggerJSDoc from 'swagger-jsdoc';
// import swaggerUi from 'swagger-ui-express';

// const swaggerOptions = {
//   definition: {
//     openapi: '3.0.0',
//     info: {
//       title: 'Quiz App API',
//       version: '1.0.0',
//       description: 'API documentation for the Quiz App (Auth, Student, Teacher)',
//     },
//     servers: [
//       {
//         url:
//           process.env.NODE_ENV === 'development'
//             ? 'http://localhost:5000/api'
//             : 'https://quizapp-backend-frj2.onrender.com/api',
//       }, // Change for production
//     ],
//     components: {
//       securitySchemes: {
//         bearerAuth: {
//           type: 'http',
//           scheme: 'bearer',
//           bearerFormat: 'JWT',
//         },
//       },
//     },
    
//   },
//   apis: ['./routes/*.js'], // Path to your route files with Swagger annotations
// };

// const swaggerSpec = swaggerJSDoc(swaggerOptions);

// export { swaggerUi, swaggerSpec };
