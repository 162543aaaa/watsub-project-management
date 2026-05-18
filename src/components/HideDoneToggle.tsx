import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface HideDoneToggleProps {
  hideDone: boolean;
  setHideDone: (value: boolean) => void;
}

export function HideDoneToggle({ hideDone, setHideDone }: HideDoneToggleProps) {
  return (
    <div className="flex items-center space-x-2">
      <Switch
        id="hide-done"
        checked={hideDone}
        onCheckedChange={setHideDone}
      />
      <Label htmlFor="hide-done">Hide Completed Tasks</Label>
    </div>
  );
}
