create database teste_unidade;
use teste_unidade;
CREATE TABLE `programa` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nome` varchar(255) DEFAULT NULL,
  `valor_o` int(11) DEFAULT NULL,
  `valor_p` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nome` (`nome`)
) ENGINE = InnoDB;
CREATE TABLE `linha_codigo` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `num_linha` int(11) DEFAULT NULL,
  `is_codigo_p` tinyint(1) DEFAULT NULL,
  `texto_linha` varchar(255) DEFAULT NULL,
  `valor` int(11) DEFAULT NULL,
  `programa_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `programa_id` (`programa_id`),
  CONSTRAINT `linha_codigo_ibfk_1` FOREIGN KEY (`programa_id`) REFERENCES `programa` (`id`)
) ENGINE = InnoDB;
CREATE TABLE `variavel` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `is_array` tinyint(1) DEFAULT NULL,
  `nome_variavel` varchar(255) DEFAULT NULL,
  `linha_codigo_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `linha_codigo_id` (`linha_codigo_id`),
  CONSTRAINT `variavel_ibfk_1` FOREIGN KEY (`linha_codigo_id`) REFERENCES `linha_codigo` (`id`)
) ENGINE = InnoDB;
CREATE TABLE `valor_variavel` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `indice` int(11) DEFAULT NULL,
  `valor_decimal` int(11) DEFAULT NULL,
  `valor_literal` varchar(255) DEFAULT NULL,
  `variavel_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `variavel_id` (`variavel_id`),
  CONSTRAINT `valor_variavel_ibfk_1` FOREIGN KEY (`variavel_id`) REFERENCES `variavel` (`id`)
) ENGINE = InnoDB;