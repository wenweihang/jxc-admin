<script type="text/jsx">
import shortcutMixin from '@/layout/mixin/tagsViewShortcut'
import decideRouterTransitionMixin from '@/layout/mixin/decideRouterTransition'
import persistenceMixin from '@/layout/mixin/tagsViewPersistent'
import {getters as appGetters} from "@/layout/store/app"
import {getters as tagsViewGetters, mutations as tagsViewMutations} from "@/layout/store/tagsView"
import ContextMenu from "@/component/menu/ContextMenu"
import ScrollPanel from './ScrollPanel'
import {refreshPage} from "@/util/route"

export default {
    mixins: [shortcutMixin, decideRouterTransitionMixin, persistenceMixin],

    components: {ContextMenu, ScrollPanel},

    data() {
        return {
            contextmenu: {
                show: false,
                top: 0,
                left: 0,
            },
            selectedTag: {}
        }
    },

    computed: {
        visitedViews: () => tagsViewGetters.visitedViews,

        menus: () => appGetters.menus,

        contextMenuItems() {
            return [
                {content: '刷新', click: this.refreshSelectedTag},
                this.isAffix(this.selectedTag)
                    ? undefined
                    : {
                        content: '关闭',
                        click: () => this.closeSelectedTag(this.selectedTag)
                    },
                {content: '关闭其他', click: this.closeOthersTags},
                {content: '关闭全部', click: this.closeAllTags}
            ]
        }
    },

    watch: {
        $route(to) {
            this.addTag(to)
            this.$nextTick(this.moveToCurrentTag)
        }
    },

    methods: {
        //判断页签是否激活，考虑redirect刷新的情况
        isActive({path}) {
            const {path: routePath} = this.$route
            return routePath === path || routePath === `/redirect${path}`
        },
        isAffix(tag) {
            return tag.meta && tag.meta.affix
        },

        initTags() {
            //获取所有需要固定显示的页签
            function getAffixTags(menus) {
                const tags = []
                menus.forEach(({name, fullPath, children, meta}) => {
                    if (meta && meta.title && meta.affix) {
                        tags.push({
                            //注意，此处的fullPath并不是$route.fullPath，而是路由树拼接后的全路径
                            fullPath,
                            path: fullPath,
                            name,
                            meta: {...meta}
                        })
                    }
                    if (children) {
                        const tempTags = getAffixTags(children)
                        tempTags.length && tags.push(...tempTags)
                    }
                })
                return tags
            }

            //添加所有固定显示的页签
            for (const tag of getAffixTags(this.menus)) {
                tagsViewMutations.addTagOnly(tag)
            }

            //将当前路由对象添加为页签
            this.addTag(this.$route)
        },
        //将具有meta.title的路由对象添加为tab页
        addTag(to) {
            to.meta.title && tagsViewMutations.addTagAndCache(to)
        },

        //横向滚动条移动至当前tab
        moveToCurrentTag() {
            //获取所有页签的componentInstance
            const tagInstances = this.$refs.scrollPanel.$children
            const tag = tagInstances.find(i => this.isActive(i.to))
            tag && this.$refs.scrollPanel.moveToTarget(tag, tagInstances)
        },

        /**
         * 右键菜单选项
         * 刷新所选、关闭所选、关闭其他、关闭所有
         */
        refreshSelectedTag() {
            if (!this.selectedTag) return
            tagsViewMutations.delCacheOnly(this.selectedTag)
            this.$nextTick(() => refreshPage(this.selectedTag))
        },
        closeSelectedTag(view) {
            if (this.isAffix(view)) return
            tagsViewMutations.delTagAndCache(view)
            this.isActive(view) && this.gotoLastView()
        },
        closeOthersTags() {
            tagsViewMutations.delOtherTagAndCache(this.selectedTag)
            //当前选中的页签不是当前路由时，跳转到选中页签的地址
            if (this.selectedTag.path !== this.$route.path) {
                return this.$router.push(this.selectedTag)
            }
        },
        closeAllTags() {
            tagsViewMutations.delAllTagAndCache()
            this.gotoLastView()
        },

        gotoLastView() {
            if (this.visitedViews.length === 0) {
                return this.$router.push('/')
            }
            const latest = this.visitedViews[this.visitedViews.length - 1]
            //只有当页签路径与当前路由路径不同时才跳转，否则刷新
            if (this.$route.path !== latest.path) {
                this.$router.push(latest.path)
            }
            else refreshPage()
        },

        openContextMenu(e, tag) {
            e.preventDefault()

            const contextMenuWidth = 105 //右键菜单的假定宽度
            const {left: elLeft, width: elWidth} = this.$el.getBoundingClientRect()
            const maxLeft = elWidth + elLeft - contextMenuWidth
            const left = e.clientX

            this.contextmenu.left = (left > maxLeft ? maxLeft : left) + 15
            this.contextmenu.top = e.clientY
            this.contextmenu.show = true

            this.selectedTag = tag
        },

        renderTags() {
            return this.visitedViews.map(tag => {
                const {path, query, fullPath, meta: {title}} = tag
                const active = this.isActive(tag), affix = this.isAffix(tag)
                const closeSelectedTag = (e, tag) => {
                    e.preventDefault()
                    this.closeSelectedTag(tag)
                }
                return (
                    <router-link
                        key={path}
                        class={{'tags-view-item': true, active}}
                        to={{path, query, fullPath}}
                        v-on:contextmenu_native={e => this.openContextMenu(e, tag)}
                        v-on:dblclick_native={e => closeSelectedTag(e, tag)}
                    >
                        <span>{title}</span>
                        {!affix && <i class="el-icon-close" on-click={e => closeSelectedTag(e, tag)}/>}
                    </router-link>
                )
            })
        }
    },

    mounted() {
        this.initTags()
    },

    render() {
        return (
            <div class="tags-view-container">
                <scroll-panel ref="scrollPanel" class="tags-view-wrapper">
                    {this.renderTags()}
                </scroll-panel>

                <context-menu
                    v-model={this.contextmenu.show}
                    items={this.contextMenuItems}
                    left={this.contextmenu.left}
                    top={this.contextmenu.top}
                />
            </div>
        )
    }
}
</script>

<style lang="scss" src="./style.scss"></style>
