#include <sys/types.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <stdlib.h>
#include <string.h>
#include <stdio.h>

#define	UDP_TEST_PORT		50001
#define UDP_SERVER_IP 		"192.168.1.106"

int main(int argC, char* arg[])
{
	struct sockaddr_in addr;
	int sockfd, len = 0;	
	int addr_len = sizeof(struct sockaddr_in);		
	char buffer[256];

	if ((sockfd = socket(AF_INET, SOCK_DGRAM, 0)) < 0) {
		perror("socket");
		exit(1);
	}

	bzero(&addr, sizeof(addr));
	addr.sin_family = AF_INET;
	addr.sin_port = htons(UDP_TEST_PORT);
	addr.sin_addr.s_addr = inet_addr(UDP_SERVER_IP);

	while(1) {

		sendto(sockfd, buffer, len, 0, (struct sockaddr *)&addr, addr_len);

    sleep(5);
	}

	return 0;
}

