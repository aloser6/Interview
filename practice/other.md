## 基础知识
1. 下载整个文件夹: wget -r -np -nH -R index.html url

## Ansible
1. ansible教程(https://www.cnblogs.com/keerya/p/7987886.html)(https://getansible.com/playbookji_ben_yu_fa)
2. 测试是否连接: ansible cloud -m ping
3. 在远程发送指令并将结果返回: ansible web -m command -a 'ls -l'

## pythonenv
1. python3 -m env env
2. source ./venv/bin/activate
3. pip install --upgrade pip
4. pip install -r requestment.txt

## pipeline
[link](https://scarletsky.github.io/2016/07/29/use-gitlab-ci-for-continuous-integration/)

## CI/CD总结
### 持续集成
#### CI
1. 当开发人员提交merge request时将会触发pipeline，对代码自动构建，规范检查，单元测试等。
2. Build line主要使用Jenkins，Gitlab runner来驱动整个pipeline。
3. 其中c++代码规范检查使用cppcheck和cpplint。c++代码依赖使用vcpkg和conan。
4. 通过pipeline的代码成为制成品，使用JFrog来对制成品进行管理。
#### CD
1. 自动部署阶段主要工作时自动配置环境，自动安装软件包，自动修改配置，自动运行并验证等工作。
2. 主要使用ansible做自动部署工作。

### 报告助手远程监控
1. 主要设计是在需要监控的设备上部署telegraf进行监控，即echobox和java后台。
2. 监控平台使用kafka来接受telegraf发送的信息，做一个流量缓冲的作用。
3. 监控平台从kafka上消费数据，并使用TIG系统进行解析（Telegraf），存储（InfluxDB），展示（Grafana）。
4. 监控的对象主要是系统层如cpu，memory；中间件如MySql，Redis；应用程序如Echo，MS等。
5. 对Metrics的传输使用MQTT协议。

### 报告助手远程分析诊断方案
1. 主要用于对Tracing和logging的收集，并诊断问题。
2. 主要设计是在需要收集的设备上部署logstash/filebeat，即EchoPilotBox。
3. 分析诊断平台使用kafka来接受filebeat发来的消息,做一个流量缓冲的作用。
4. 分析诊断平台从kafka上消费数据，并使用ELK系统进行解析（Logstash），存储和索引（Elasticsearch）,分析显示（Kibana）.
5. 日志需满足一定的格式和要求，以便解析分析。

## 要学的
1. gstreamer
2. [mqtt](https://zhuanlan.zhihu.com/p/652694920)
