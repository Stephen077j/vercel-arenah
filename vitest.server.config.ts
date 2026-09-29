import { defineConfig } from "vitest/config";

// Tests du serveur (IA, utilitaires) : environnement Node, sans navigateur.
// Les variables ci-dessous permettent d'importer les modules qui lisent la
// configuration ; aucune connexion à la base n'est ouverte par ces tests.
export default defineConfig({
  test: {
    environment: "node",
    include: ["server/**/*.test.ts"],
    env: {
      JWT_SECRET: "test-secret-uniquement-pour-les-tests-unitaires",
      DB_PASSWORD: "test",
    },
  },
});
