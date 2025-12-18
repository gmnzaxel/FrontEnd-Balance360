import React from 'react';
import { Menu } from 'lucide-react';

const Header = ({ title, onToggleSidebar, menuSlot }) => {
  return (
    <header className="app-header">
      <div className="header-left">
        <button className="ghost-icon lg-hidden" onClick={onToggleSidebar} aria-label="Abrir menú">
          <Menu size={22} />
        </button>
        <div>
          <p className="eyebrow">Balance360</p>
          <h1 className="page-title">{title}</h1>
        </div>
      </div>
      <div className="header-right">
        {menuSlot}
      </div>
    </header>
  );
};

export default Header;
