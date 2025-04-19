import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"
import './sonner-toast-custom.css';

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "sonner-toast-custom group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "sonner-toast-description group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground sonner-toast-custom",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground sonner-toast-custom",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
