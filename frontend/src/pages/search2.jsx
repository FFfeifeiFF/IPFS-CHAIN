    import Head from '../components/Head';
    import SearchResults2 from '../components/SearchResults2';
    import Footer from '../components/Footer';
    import React from 'react';
    import '../css/Index.css';
    import Sidebar2 from "../components/Sidebar2"; // 引入 CSS 样式文件
    import { useLocation } from 'react-router-dom';
    //查询界面
    function Search2() {
        const location = useLocation();
        const searchParams = new URLSearchParams(location.search); // 创建 URLSearchParams 对象
        const username = searchParams.get('username'); // 从 URL 参数中获取 username

        console.log("Username from URL:", username); // 打印获取到的 username
        return (
            <div className="container">
                <Head username={username}/>
                <div className="content-area">
                    <SearchResults2/>
                       <Sidebar2 username={username} />
                </div>
                <Footer/>
            </div>
        );
    }


    export default Search2;