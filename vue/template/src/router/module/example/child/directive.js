export default {
    path: 'directive',
    meta: {title: '全局指令', icon: 'el-icon-s-grid', alwaysShow: true},
    children: [
        {
            path: 'dragDialog',
            component: 'example/directive/dragDialog',
            meta: {title: '可拖拽dialog'}
        }
    ]
}
