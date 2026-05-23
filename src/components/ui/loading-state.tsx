type LoadingStateProps = {
  label?: string;
};

export function LoadingState({ label = "Carregando..." }: LoadingStateProps) {
  return (
    <div className="flex items-center gap-2 text-sm opacity-60">
      <span className="animate-spin size-4 rounded-full border-2 border-current border-t-transparent" />
      {label}
    </div>
  );
}
