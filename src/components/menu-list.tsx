import { motion } from "motion/react";

function MenuList({ children }: { children: React.ReactNode }) {
  return <ul>{children}</ul>;
}

function Item({
  children,
  index,
  onClick,
}: {
  children: React.ReactNode;
  index: number;
  onClick?: () => void;
}) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.2 }}
    >
      <div 
        className="flex items-center rounded-xl gap-3 p-3 data-[clickable=true]:cursor-pointer data-[clickable=true]:hover:bg-white/10 duration-150 hover:ring-2 hover:ring-white/10"
        data-clickable={!!onClick} 
        onClick={onClick}
      >
        {children}
      </div>
    </motion.li>
  );
}

function Thumbnail({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="flex-none">
      <img src={src} alt={alt} className="size-30 object-cover rounded-xl" />
    </div>
  );
}

function Info({
  name,
  description,
  price,
  action,
}: {
  name: string;
  description?: string;
  price: string;
  action?: boolean;
}) {
  return (
    <div className="flex-1 p-3 text-white">
      <div className="flex flex-nowrap gap-4">
        <div className="flex-1">
          <p className="font-body font-bold text-base text-wrap w-full leading-snug">{name}</p>
        </div>
        <div className="flex-none flex items-center gap-1">
          <p className="font-body font-bold text-sm leading-snug">{price}</p>
          {action && (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
              <path d="m9 18 6-6-6-6" />
            </svg>
          )}
        </div>
      </div>
      {description && (
        <p className="font-body text-sm leading-snug [&+p]:mt-1">{description}</p>
      )}
    </div>
  );
}

function Action({ children }: { children: React.ReactNode }) {
  return <div className="flex-none">{children}</div>;
}

Item.Thumbnail = Thumbnail;
Item.Info = Info;
Item.Action = Action;
MenuList.Item = Item;

export { MenuList };
