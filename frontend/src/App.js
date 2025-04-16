import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Login from './pages/login'; // 你的第一个界面组件
import Regisiter from './pages/regisiter'; // 你的第二个界面组件
import Index from './pages/index';
import Search from './pages/search';
import Search2 from './pages/search2';
import Departlist from './pages/depart_list'
import Fileupload from "./pages/Fileupload";
import FileManager from "./pages/myfile";
import ChangeProfilePage from "./pages/ChangeProfilePage";
import FileStats from "./components/FileStats";
function App() {
  return (
    <div className="App">
      <Routes>
          <Route path="/" element={<Login />} /> {/* 定义根路径对应的组件 */}
          <Route path="/login" element={<Login />} /> { }
          <Route path="/regisiter" element={<Regisiter />} /> {/* 定义 /second 路径对应的组件 */}
          <Route path="/index" element={<Index/>} /> {}
          <Route path="/search" element={<Search/>} /> {}
          <Route path="/search2" element={<Search2/>} /> {}
          <Route path="/depart_list" element={<Departlist/>} /> {}
          <Route path="/fileupload" element={<Fileupload/>} /> {}
          <Route path="/myfile" element={<FileManager/>} />{}
          <Route path="/changeprofile" element={<ChangeProfilePage/>}/>{}
          <Route path="/file-stats" element={<FileStats/>}/>{}
      </Routes>
    </div>
  );
}

export default App;