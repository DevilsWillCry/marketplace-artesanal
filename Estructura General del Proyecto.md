```text
marketplace-artesanal/
├── backend/
│   ├── src/
│   │   ├── config/           # Configuración del sistema
│   │   │   ├── database.ts
│   │   │   └── env.ts
│   │   ├── controllers/      # Controladores (lógica de rutas)
│   │   │   ├── auth.controller.ts
│   │   │   ├── product.controller.ts
│   │   │   └── order.controller.ts
│   │   ├── services/         # Lógica de negocio
│   │   │   ├── auth.service.ts
│   │   │   ├── product.service.ts
│   │   │   └── notification.service.ts
│   │   ├── repositories/     # Repository Pattern (acceso a datos)
│   │   │   ├── user.repository.ts
│   │   │   ├── product.repository.ts
│   │   │   └── order.repository.ts
│   │   ├── models/           # Modelos de datos
│   │   │   ├── user.model.ts
│   │   │   ├── product.model.ts
│   │   │   └── interfaces/   # Interfaces TypeScript
│   │   │       └── TokenPayload.ts
│   │   ├── routes/           # Definición de rutas
│   │   │   ├── api.routes.ts
│   │   │   ├── auth.routes.ts
│   │   │   ├── product.routes.ts
│   │   │   └── index.ts
│   │   ├── middleware/       # Middlewares
│   │   │   ├── auth.middleware.ts
│   │   │   ├── admin.middleware.ts
│   │   │   └── error.middleware.ts
│   │   ├── utils/            # Utilidades
│   │   │   ├── auth.ts
│   │   │   ├── emailSender.ts
│   │   │   ├── rateLimiter.ts
│   │   │   ├── logger.ts
│   │   │   └── helpers.ts
│   │   ├── validators/       # Validadores
│   │   │   └── product.validator.ts
│   │   ├── types/            # Tipos personalizados
│   │   │   ├── extended.d.ts
│   │   ├── app.ts            # Configuración principal
│   │   └── server.ts         # Punto de entrada
│   ├── .env
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── public/               # Assets estáticos
│   ├── src/
│   │   ├── api/              # Servicios API (Axios)
│   │   │   ├── authApi.ts
│   │   │   └── productApi.ts
│   │   ├── components/       # Componentes UI
│   │   │   ├── common/       # Componentes reutilizables
│   │   │   │   ├── Button.tsx
│   │   │   │   └── Card.tsx
│   │   │   ├── products/
│   │   │   │   ├── ProductList.tsx   # Presentacional
│   │   │   │   └── ProductCard.tsx
│   │   │   └── auth/
│   │   │       └── LoginForm.tsx
│   │   ├── containers/       # Componentes contenedores (lógica)
│   │   │   ├── ProductListContainer.tsx
│   │   │   └── AuthContainer.tsx
│   │   ├── store/            # Estado global (Redux)
│   │   │   ├── slices/       # Redux Toolkit slices
│   │   │   │   ├── authSlice.ts
│   │   │   │   └── productSlice.ts
│   │   │   └── store.ts
│   │   ├── hooks/            # Custom hooks
│   │   │   ├── useFetchProducts.ts
│   │   │   └── useAuth.ts
│   │   ├── pages/            # Páginas/Vistas
│   │   │   ├── HomePage.tsx
│   │   │   ├── ProductPage.tsx
│   │   │   └── DashboardPage.tsx
│   │   ├── assets/           # Imágenes/fuentes
│   │   ├── styles/           # Estilos globales
│   │   ├── utils/            # Utilidades frontend
│   │   ├── App.tsx           # Componente raíz
│   │   └── index.tsx         # Punto de entrada
│   ├── .env
│   ├── package.json
│   └── tsconfig.json
│
├── .dockerignore
├── docker-compose.yml         # Configuración Docker
└── README.md
```