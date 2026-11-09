import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchExternalImage } from "@/features/pptx/images/fetch-external-image";

describe("fetchExternalImage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("retorna o buffer quando a resposta é ok e o content-type é imagem", async () => {
    const arrayBuffer = new TextEncoder().encode("fake-image-bytes").buffer;
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ "content-type": "image/jpeg" }),
      arrayBuffer: async () => arrayBuffer,
    } as never);

    const result = await fetchExternalImage("https://example.com/foto.jpg");

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.value.mimeType).toBe("image/jpeg");
    expect(result.value.buffer).toBeInstanceOf(Buffer);
  });

  it("retorna o motivo da falha (HTTP status) quando o status não é ok", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 404, headers: new Headers() } as never);
    const result = await fetchExternalImage("https://example.com/404.jpg");
    expect(result).toEqual({ ok: false, reason: "HTTP 404" });
  });

  it("retorna o motivo da falha quando o content-type não é imagem", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ "content-type": "text/html" }),
      arrayBuffer: async () => new ArrayBuffer(0),
    } as never);
    const result = await fetchExternalImage("https://example.com/pagina.html");
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.reason).toContain("text/html");
  });

  it("retorna o motivo da falha para URL malformada, sem chamar fetch", async () => {
    const result = await fetchExternalImage("não é uma url");
    expect(result).toEqual({ ok: false, reason: "URL malformada" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("retorna o motivo da falha quando o fetch lança (timeout/abort)", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("aborted"));
    const result = await fetchExternalImage("https://example.com/lenta.jpg");
    expect(result.ok).toBe(false);
  });
});
