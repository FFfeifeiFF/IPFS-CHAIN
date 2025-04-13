//用户登入后的界面展示
import Head from '../components/Head';
import Footer from '../components/Footer';
import React from 'react';
import '../css/Index.css';
import ArticleList from "../components/ArticleList";
import Sidebar2 from "../components/Sidebar2";
import { useLocation } from 'react-router-dom';

function Departlist() {
    const location = useLocation();
    const username = location.state?.username;

    return (
        <div className="container">
            <Head username={username}/>
            <div className="content-area">
             <ArticleList username={username}/>
                 <Sidebar2 username={username} />
            </div>
            <Footer/>
        </div>
    );
}

export default Departlist;