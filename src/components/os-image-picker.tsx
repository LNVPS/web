import classNames from "classnames";
import { FormattedMessage } from "react-intl";
import { VmOsImage } from "../api";
import OsImageName from "./os-image-name";
import OsImageIcon from "./os-image-icon";
import { isNewImage, sortOsImages } from "../os-images";

/** The single OS image chooser used across the app (ordering + reinstall).
 * Owns the canonical ordering and per-image chrome (popularity meter, New /
 * Current badges) so every screen presents images identically. */
export default function OsImagePicker({
  images,
  selected,
  onSelect,
  currentImageId,
  className,
}: {
  images: Array<VmOsImage>;
  selected: number;
  onSelect: (id: number) => void;
  /** When set, the matching image is marked as the VM's current image. */
  currentImageId?: number;
  className?: string;
}) {
  return (
    <div
      className={classNames(
        "grid grid-cols-2 sm:grid-cols-3 gap-2",
        className,
      )}
    >
      {sortOsImages(images).map((a) => {
        const isSelected = selected === a.id;
        const isCurrent = a.id === currentImageId;
        const isNew = isNewImage(a);
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => onSelect(a.id)}
            className={classNames(
              "group relative flex flex-col gap-2 rounded-sm border p-3 text-left transition-all duration-150",
              isSelected
                ? "border-cyber-primary bg-cyber-panel-light shadow-neon-sm"
                : "border-cyber-border bg-cyber-panel hover:border-cyber-primary/50",
            )}
          >
            {(isNew || isCurrent) && (
              <div className="absolute right-2 top-2 flex items-center gap-1.5">
                {isNew && (
                  <span className="rounded-sm border border-cyber-primary/50 px-1 text-[0.55rem] uppercase leading-[1.5] tracking-[0.15em] text-cyber-primary">
                    <FormattedMessage defaultMessage="New" />
                  </span>
                )}
                {isCurrent && (
                  <span className="text-[0.55rem] uppercase leading-[1.5] tracking-[0.15em] text-cyber-muted">
                    <FormattedMessage defaultMessage="Current" />
                  </span>
                )}
              </div>
            )}
            <div className="flex items-center gap-2.5 pr-16">
              <OsImageIcon distribution={a.distribution} />
              <span className="text-sm font-medium text-cyber-text-bright leading-tight">
                <OsImageName image={a} />
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
