# -*- coding: utf-8 -*-
# Generated by Django 1.9.8 on 2016-09-28 16:57
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('financialaid', '0007_currencyexchangerate'),
    ]

    operations = [
        migrations.AddField(
            model_name='financialaid',
            name='date_documents_sent',
            field=models.DateField(null=True),
        ),
    ]
