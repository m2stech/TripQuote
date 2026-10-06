interface FormFieldErrorProps {
  message?: string;
}

/**
 * Mensagem de erro de validação inline, no padrão usado em todo o formulário
 * de orçamento. Não renderiza nada quando não há mensagem.
 */
export function FormFieldError({ message }: FormFieldErrorProps) {
  if (!message) return null;
  return (
    <p className="text-destructive text-xs" role="alert">
      {message}
    </p>
  );
}
