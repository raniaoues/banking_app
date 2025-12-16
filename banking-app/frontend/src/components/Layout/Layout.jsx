import React from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import '../../styles/layout.css';

const Layout = ({ children }) => {
  return (
    <div className="layout-container">
      <Sidebar />
      <div className="main-wrapper">
        <Navbar />
        <main className="content-area">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;