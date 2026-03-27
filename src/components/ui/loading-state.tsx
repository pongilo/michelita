type LoadingStateProps = {
  label?: string;
};

export function LoadingState({ label = "Carregando..." }: LoadingStateProps) {
  return (
    <div className="flex items-center gap-2 text-sm opacity-60">
      <span className="loading loading-spinner loading-sm" />
      {label}
    </div>
  );
}
