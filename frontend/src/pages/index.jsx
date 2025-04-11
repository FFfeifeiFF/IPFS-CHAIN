import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import ArticleList from '../components/ArticleList';
import Footer from '../components/Footer';
import React from 'react';
import '../css/Index.css'; // 引入 CSS 样式文件
function Index() {
    return (
        <div className="container">
            <Header/>
            <div className="content-area">
                <ArticleList/>
                <Sidebar/>
            </div>
            <Footer/>
        </div>
    );
}


export default Index;