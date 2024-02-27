# Conan is a C/C++ libeaeies manager.

## Summary
Conan是用于管理C/C++包和依赖的软件,搭建conan_server服务器管理私有的C/C++包。
可将包 upload 到远程服务器，也可以从远程服务器 install 包。


## Install
```sh
need Python>=3.4 and pip
pip install -i https://pypi.tuna.tsinghua.edu.cn/simple conan_server
pip install conan==1.*
```

## Usage
#### 1、在需要作为服务器的机器上运行  
   ```sh
   ./conan_server
   ```
   设置服务器别名(后面对远程操作都得用服务器别名)，服务器别名可以有多个，但是都指向一个服务器
   ```sh
   conan remote add <servername> <url of server>
   ```

#### 2、在服务器上添加 上传/下载 包时的 username 和 passward
   ```sh
   cd ~/.conan_server
   vim server.conf
   ```
   打开后在最下面的 [user] 下添加 username:passward


#### 3、切换 上传/下载 包时的 username (不切换会导致上传不了，权限拒绝访问的问题)
   ```sh
   conan user -r <servername> <username>
   ```

#### 4。构建conanfile模板
   执行下面的命令会在当前目录生成conan模板，包括include，src，test_package目录，以及CMakeList.txt，conanfile.py文件，可将三个目录中多余的文件删除，test_package可直接删除，然后更改CMakeList.txt，conanfile.py
   ```sh
   conan new <packagename>/<version> --template cmake_lib
   ```   


#### 5、创建本地 conan 包
   ```sh
   conan create <指定的目录> <username>/<channel>
   ```
   username必须是之前在服务器配置文件中设置的


#### 6、上传包
   ```sh
   conan upload <packagename>/<version number>@<username>/<channel> --all -r <servername>
   ```
   输入username and password


#### 7、当需要使用conan_server上的某个包时
   ```sh
   vim conanfile.txt
   ```
   ```conanfile.txt
   [require]
   packagename/version
   [generator]
   need generator(指定生成器来构建项目，例如CMakeDeps,CMakeToolchain)
   ``` 


#### 8、下载包
   ```sh
   conan install . --output-folder=build --build=missing
   ```
   注意，下载的包的一些文件会存储在当前目录


#### 9、编译链接
   ```sh
   mkdir -p build
   cd build
   cmake .. -DCMAKE_TOOLCHAIN_FILE=build/Release/generators/conan_toolchain.cmake -DCMAKE_BUILD_TYPE=Release
   如果cmake有问题请将DCMAKE_TOOLCHAIN_FILE的值换成onan_toolchain.cmake 所在目录，一般都在当前目录
   make -j4
   ```

#### 10、其他有用的命令
    ```sh
    conan search //查看本地被管理的conan包
    conan search -r <server name>  //查看远程服务器包名
    conan remote list   //查看所有服务器别名
    conan remove <packagename/version number>@<username>/<channel>  //删除本地包
    conan remove <packagename/version number>@<username>/<channel> -r <servername>  //删除远程包
    ```
