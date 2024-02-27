## 基础知识
1. 下载整个文件夹: wget -r -np -nH -R index.html url

## Ansible
1. ansible教程(https://www.cnblogs.com/keerya/p/7987886.html)(https://getansible.com/playbookji_ben_yu_fa)
2. 测试是否连接: ansible cloud -m ping
3. 在远程发送指令并将结果返回: ansible web -m command -a 'ls -l'
