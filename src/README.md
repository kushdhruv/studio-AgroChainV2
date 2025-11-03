# AgriChain DApp

AgriChain is a decentralized application prototype designed to revolutionize the agricultural supply chain. It provides a transparent and efficient marketplace connecting farmers, transporters, and industries on a simulated blockchain platform. The application also includes an AI-powered oversight dashboard for government entities.

## Tech Stack

This project is built with a modern, type-safe, and component-based architecture.

- **Framework**: [Next.js](https://nextjs.org/) (using the App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **UI Components**: [ShadCN UI](https://ui.shadcn.com/) - A collection of beautifully designed, accessible components.
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) - A utility-first CSS framework for rapid UI development.
- **State Management & Data Persistence**: The application uses a combination of React Context API (`AuthProvider`) for global state management and the browser's **`localStorage`** for data persistence. This means all user and shipment data is stored directly in your browser, creating a client-side only experience without a backend database.
- **Form Handling**: [React Hook Form](https://react-hook-form.com/) for building performant and flexible forms.
- **Schema Validation**: [Zod](https://zod.dev/) for type-safe schema declaration and validation.
- **Generative AI**: [Genkit](https://firebase.google.com/docs/genkit) (with Google's Gemini models) for the AI-powered anomaly detection feature in the government oversight dashboard.

## Application Flow & Features

The application supports several user roles, each with a dedicated dashboard and specific functionalities.

### 1. Authentication
- **Multi-Role Registration**: Users can sign up as a `Farmer`, `Transporter`, `Industry`, or `Government` entity. Each role has a specific registration form to collect relevant details.
- **Password-Based Login**: Users log in using their email, password, and selected role.
- **Default Admin User**: The application initializes with a default `Admin` user for platform management.
  - **Email**: `admin@agrichain.com`
  - **Password**: `password`
- **Session Management**: User sessions and all application data (users, shipments) are persisted in the browser's `localStorage` to keep users logged in and to retain data between sessions.

### 2. User Roles & Dashboards

- **Farmer**:
  - Can list their agricultural produce or waste by creating new shipments.
  - Upload images and details for each shipment, which are then listed on the marketplace.
  - View and track their active and past shipments.

- **Transporter**:
  - Can browse the marketplace for pending shipments.
  - Accept shipments to transport (simulated).
  - View and manage their active deliveries.

- **Industry**:
  - Can browse the marketplace to source agricultural produce or waste.
  - "Purchase" shipments by accepting offers (simulated).
  - Track the status of their incoming shipments.

- **Government**:
  - Has access to a global oversight dashboard showing all shipments in the supply chain.
  - Can use an AI-powered tool to analyze individual shipments for potential anomalies, fraud, or inefficiencies.

- **Admin**:
  - Has access to an admin console to manage platform participants.
  - Can approve or reject new user registrations (simulated).

### 3. Core Features
- **Marketplace**: A central hub where all "Pending" shipments are listed, available for Transporters and Industries.
- **Shipment Tracking**: Detailed view for each shipment, showing its current status, route, and a historical timeline of events.
- **Profile Management**: Users can view and edit their profile information, including their name, email, and role-specific details.
- **Wallet Connection**: A simulated "Connect Wallet" feature allows users to associate a mock wallet address with their profile.

## Getting Started

The application is designed to run in a development environment.

1.  **Install Dependencies**:
    ```bash
    npm install
    ```
2.  **Run the Development Server**:
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:9002`.

## Folder Structure

Here is a high-level overview of the key directories:

- **`src/app`**: Contains all the pages and layouts, following the Next.js App Router structure.
  - `(auth)`: Route group for authentication pages (login, register).
  - `(app)/dashboard`: Route group for all authenticated user dashboards.
- **`src/components`**: Contains all React components, organized by feature (e.g., `auth`, `dashboard`, `shipments`) and a `ui` folder for ShadCN components.
- **`src/lib`**: Core application logic, including:
  - `auth.tsx`: The main `AuthProvider` for state management, authentication logic, and `localStorage` persistence.
  - `types.ts`: TypeScript type definitions for the entire application.
  - `actions.ts`: Server Actions, used for calling Genkit flows.
  - `mock-data.ts`: Initial data for shipments.
- **`src/ai`**: Contains the Genkit implementation.
  - `flows`: Defines the AI flows, such as the anomaly detection logic.
  - `genkit.ts`: Genkit configuration file.
- **`public`**: Static assets.
- **`tailwind.config.ts`**: Configuration for Tailwind CSS.
