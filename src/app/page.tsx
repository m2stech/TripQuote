import { redirect } from "next/navigation";

/**
 * Redireciona a raiz para o login (M3). A proteção real de rota chega no M4;
 * por ora, o login mockado é o ponto de entrada da aplicação.
 */
export default function Home() {
  redirect("/login");
}
